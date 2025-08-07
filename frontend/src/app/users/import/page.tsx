"use client";

import { useState, useRef, lazy, Suspense } from "react";
import Link from "next/link";
import { importUsers, downloadSampleCSV, checkDuplicates } from "../../../lib/api/users";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Alert,
  Badge,
  Input,
  Select
} from "@/components/ui";

// 重いTable関連コンポーネントを遅延読み込み
const Table = lazy(() => import("@/components/ui").then(module => ({ default: module.Table })));
const TableHeader = lazy(() => import("@/components/ui").then(module => ({ default: module.TableHeader })));
const TableBody = lazy(() => import("@/components/ui").then(module => ({ default: module.TableBody })));
const TableRow = lazy(() => import("@/components/ui").then(module => ({ default: module.TableRow })));
const TableHead = lazy(() => import("@/components/ui").then(module => ({ default: module.TableHead })));
const TableCell = lazy(() => import("@/components/ui").then(module => ({ default: module.TableCell })));

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface ImportResult {
  success?: boolean;
  message?: string;
  results?: {
    imported: number;
    updated: number;
    skipped: number;
    errors: number;
    total_processed: number;
    strategy: string;
  };
  details?: {
    imported_users: Array<{
      line: number;
      id: number;
      name: string;
      email: string;
      action: string;
    }>;
    updated_users: Array<{
      line: number;
      id: number;
      name: string;
      email: string;
      action: string;
    }>;
    skipped_users: Array<{
      line: number;
      name: string;
      email: string;
      reason: string;
    }>;
  };
  errors?: Array<{
    line: number;
    error: string;
    data: unknown;
  }>;
}

interface CSVPreviewData {
  headers: string[];
  rows: string[][];
  allRows: string[][];
  totalRows: number;
  isValid: boolean;
  errors: string[];
}

interface DuplicateAnalysis {
  total_records: number;
  new_records: number;
  duplicate_records: number;
  recommended_strategy: 'create' | 'update' | 'skip';
  recommendations: string[];
}

interface DuplicateDetails {
  duplicates: Array<{
    line: number;
    csv_data: {
      name: string;
      email: string;
      phone_number?: string;
    };
    existing_user: {
      id: number;
      name: string;
      email: string;
      phone_number?: string;
      created_at?: string;
      updated_at?: string;
    };
  }>;
  new_users: Array<{
    line: number;
    name: string;
    email: string;
    phone_number?: string;
  }>;
}

export default function ImportUsersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CSVPreviewData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewMode, setPreviewMode] = useState<'sample' | 'all'>('sample');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPreviewPage, setCurrentPreviewPage] = useState(1);
  const [previewPerPage] = useState(20);
  const [importStrategy, setImportStrategy] = useState<'create' | 'update' | 'skip'>('create');
  const [showDetails, setShowDetails] = useState<'imported' | 'updated' | 'skipped' | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [duplicateAnalysis, setDuplicateAnalysis] = useState<DuplicateAnalysis | null>(null);
  const [, setDuplicateDetails] = useState<DuplicateDetails | null>(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ステップ管理
  const goToStep = (step: 1 | 2 | 3 | 4) => {
    setCurrentStep(step);
    setError(null);
    setSuccess(null);
  };

  const canProceedToStep = (step: number): boolean => {
    switch (step) {
      case 2: return file !== null;
      case 3: return file !== null && csvPreview !== null && csvPreview.isValid && duplicateAnalysis !== null;
      case 4: return importResult !== null;
      default: return true;
    }
  };

  const resetImport = () => {
    setFile(null);
    setCsvPreview(null);
    setImportResult(null);
    setShowDetails(null);
    setDuplicateAnalysis(null);
    setDuplicateDetails(null);
    setCurrentStep(1);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ファイル検証
  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return "CSVファイル（.csv）を選択してください。";
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `ファイルサイズが大きすぎます。最大${MAX_FILE_SIZE / 1024 / 1024}MBまで対応しています。`;
    }
    
    return null;
  };

  // CSVファイル解析
  const parseCSVFile = (file: File): Promise<CSVPreviewData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim().length > 0);
          
          if (lines.length < 2) {
            resolve({
              headers: [],
              rows: [],
              allRows: [],
              totalRows: 0,
              isValid: false,
              errors: ['CSVファイルが空またはヘッダー行のみです。']
            });
            return;
          }

          const parseCSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              
              if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                  current += '"';
                  i++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
              } else {
                current += char;
              }
            }
            result.push(current);
            
            return result;
          };

          const headers = parseCSVLine(lines[0]);
          const allDataRows = lines.slice(1);
          const allRows = allDataRows.map(line => parseCSVLine(line));
          const sampleRows = allRows.slice(0, 5);

          const errors: string[] = [];
          
          if (headers.length === 0) {
            errors.push('ヘッダー行が見つかりません。');
          }

          resolve({
            headers,
            rows: sampleRows,
            allRows,
            totalRows: allRows.length,
            isValid: errors.length === 0,
            errors
          });
        } catch {
          reject(new Error('CSVファイルの解析中にエラーが発生しました。'));
        }
      };
      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました。'));
      reader.readAsText(file, 'UTF-8');
    });
  };

  const analyzeFile = async (selectedFile: File) => {
    setIsAnalyzing(true);
    try {
      const previewData = await parseCSVFile(selectedFile);
      setCsvPreview(previewData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "ファイル分析中にエラーが発生しました。";
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const performDuplicateCheck = async () => {
    if (!file) return;

    setCheckingDuplicates(true);
    setError(null);
    
    try {
      const result = await checkDuplicates(file);
      setDuplicateAnalysis(result.analysis);
      setDuplicateDetails(result.details);
      
      // 推奨戦略に自動設定
      setImportStrategy(result.analysis.recommended_strategy);
      
      // Step3に進む
      setCurrentStep(3);
    } catch (err: unknown) {
      console.error("Duplicate check error:", err);
      setError("重複チェック中にエラーが発生しました。ネットワーク接続を確認してください。");
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setSuccess(null);
    setImportResult(null);
    setDuplicateAnalysis(null);
    setDuplicateDetails(null);
    
    await analyzeFile(selectedFile);
    setCurrentStep(2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("ファイルを選択してください。");
      return;
    }

    if (csvPreview && !csvPreview.isValid) {
      setError("CSVファイルに問題があります。修正してから再度お試しください。");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setImportResult(null);

      const result = await importUsers(file, importStrategy);
      
      setImportResult(result);

      if (result.success) {
        if (result.results?.errors && result.results.errors > 0) {
          const successCount = (result.results.imported || 0) + (result.results.updated || 0) + (result.results.skipped || 0);
          if (successCount > 0) {
            setSuccess(`${successCount}件を処理しました。${result.results.errors}件のエラーもありました。`);
          } else {
            setError(`${result.results.errors}件のエラーがありました。詳細は下記をご確認ください。`);
          }
        } else {
          setSuccess(result.message);
        }
      }

      setCurrentStep(4);
    } catch (err: unknown) {
      console.error("Import error:", err);
      
      if (err && typeof err === 'object' && 'response' in err) {
        const errorWithResponse = err as { response?: { status?: number } };
        if (errorWithResponse.response?.status === 422) {
          setError("入力データに問題があります。CSVファイルの内容を確認してください。");
        } else if (errorWithResponse.response?.status) {
          setError(`サーバーエラーが発生しました。しばらく時間をおいて再度お試しください。（エラーコード: ${errorWithResponse.response.status}）`);
        } else {
          setError("インポート処理中にエラーが発生しました。");
        }
      } else {
        setError("インポート処理中にエラーが発生しました。ネットワーク接続を確認してください。");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      await downloadSampleCSV();
    } catch {
      setError("サンプルファイルのダウンロードに失敗しました。");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // プレビューデータフィルタリング
  const getFilteredRows = () => {
    if (!csvPreview) return [];
    const rowsToUse = previewMode === 'all' ? csvPreview.allRows : csvPreview.rows;
    if (!searchQuery.trim()) return rowsToUse;
    const query = searchQuery.toLowerCase();
    return rowsToUse.filter(row => 
      row.some(cell => cell.toLowerCase().includes(query))
    );
  };

  const getPaginatedRows = () => {
    const filteredRows = getFilteredRows();
    const startIndex = (currentPreviewPage - 1) * previewPerPage;
    const endIndex = startIndex + previewPerPage;
    return filteredRows.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const filteredRows = getFilteredRows();
    return Math.ceil(filteredRows.length / previewPerPage);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ステップのタイトルと説明
  const stepInfo = {
    1: { title: "ファイル選択", description: "インポートするCSVファイルを選択してください" },
    2: { title: "プレビュー", description: "ファイル内容を確認し、データを検証してください" },
    3: { title: "インポート設定", description: "重複データの処理方法を選択してください" },
    4: { title: "結果", description: "インポート処理の結果を確認してください" }
  };

  // ステップコンテンツのレンダリング
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                ファイル選択
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200
                  ${isDragOver 
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="space-y-4">
                  <svg className="mx-auto w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4" />
                  </svg>
                  <div>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">
                      CSVファイルをここにドラッグ
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      または
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="min-w-[120px]"
                    >
                      ファイル選択
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleDownloadTemplate}
                      isLoading={downloadingTemplate}
                      className="min-w-[120px]"
                    >
                      サンプルDL
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    対応形式: CSV / 最大サイズ: {MAX_FILE_SIZE / 1024 / 1024}MB
                  </p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {file && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">選択されたファイル</h3>
                  <div className="flex items-center gap-3">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      削除
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                データプレビュー
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isAnalyzing && (
                <div className="flex items-center justify-center p-8">
                  <div className="flex items-center gap-3">
                    <svg className="animate-spin w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-blue-600 dark:text-blue-300">ファイルを分析中...</p>
                  </div>
                </div>
              )}

              {csvPreview && !isAnalyzing && (
                <div className="space-y-4">
                  {csvPreview.isValid ? (
                    <Alert variant="success">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p>CSVファイルは有効です。{csvPreview.totalRows}行のデータが見つかりました。</p>
                    </Alert>
                  ) : (
                    <Alert variant="error">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-medium mb-2">CSVファイルに問題があります:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {csvPreview.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </Alert>
                  )}

                  {csvPreview.isValid && (
                    <div>
                      <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <label htmlFor="preview-mode" className="text-sm font-medium">表示モード:</label>
                          <Select
                            id="preview-mode"
                            value={previewMode}
                            onChange={(e) => setPreviewMode(e.target.value as 'sample' | 'all')}
                            options={[
                              { value: 'sample', label: '5件' },
                              { value: 'all', label: '全データ' }
                            ]}
                            className="w-32"
                          />
                        </div>
                        
                        {previewMode === 'all' && (
                          <div className="flex-1 max-w-xs">
                            <Input
                              type="text"
                              placeholder="データを検索..."
                              value={searchQuery}
                              onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPreviewPage(1);
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <Suspense fallback={<div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-64" />}>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-16">#</TableHead>
                                {csvPreview.headers.map((header, index) => (
                                  <TableHead key={index}>
                                    {header}
                                    {searchQuery && (
                                      <span 
                                        dangerouslySetInnerHTML={{
                                          __html: header.replace(
                                            new RegExp(`(${searchQuery})`, 'gi'),
                                            '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>'
                                          )
                                        }}
                                      />
                                    )}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getPaginatedRows().map((row, rowIndex) => {
                                const actualRowNumber = previewMode === 'all' 
                                  ? (currentPreviewPage - 1) * previewPerPage + rowIndex + 1
                                  : rowIndex + 1;
                                return (
                                  <TableRow key={rowIndex}>
                                    <TableCell className="font-medium text-gray-500">
                                      {actualRowNumber}
                                    </TableCell>
                                    {row.map((cell, cellIndex) => (
                                      <TableCell key={cellIndex}>
                                        {searchQuery ? (
                                          <span 
                                            dangerouslySetInnerHTML={{
                                              __html: cell.replace(
                                                new RegExp(`(${searchQuery})`, 'gi'),
                                                '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>'
                                              )
                                            }}
                                          />
                                        ) : (
                                          cell
                                        )}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </Suspense>

                      {previewMode === 'all' && getTotalPages() > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {getFilteredRows().length}件中 {((currentPreviewPage - 1) * previewPerPage) + 1}-{Math.min(currentPreviewPage * previewPerPage, getFilteredRows().length)}件を表示
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPreviewPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPreviewPage === 1}
                            >
                              前へ
                            </Button>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {currentPreviewPage} / {getTotalPages()}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPreviewPage(prev => Math.min(getTotalPages(), prev + 1))}
                              disabled={currentPreviewPage === getTotalPages()}
                            >
                              次へ
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {csvPreview && csvPreview.isValid && (
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">次のステップ</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                        インポート戦略を選択する前に、既存データとの重複をチェックします。
                      </p>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={performDuplicateCheck}
                        disabled={checkingDuplicates}
                        isLoading={checkingDuplicates}
                        className="w-full sm:w-auto"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {checkingDuplicates ? "重複チェック中..." : "重複チェック実行"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                インポート設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 重複チェック結果 */}
              {duplicateAnalysis && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    重複チェック結果
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {duplicateAnalysis.new_records}
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400">新規データ</div>
                    </div>
                    
                    <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {duplicateAnalysis.duplicate_records}
                      </div>
                      <div className="text-sm text-yellow-600 dark:text-yellow-400">重複データ</div>
                    </div>
                    
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {duplicateAnalysis.total_records}
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">総レコード数</div>
                    </div>
                  </div>

                  {duplicateAnalysis.recommendations.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">推奨設定</h5>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                        {duplicateAnalysis.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  重複データの処理方法
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className={`relative flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    duplicateAnalysis?.recommended_strategy === 'create'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                    {duplicateAnalysis?.recommended_strategy === 'create' && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        推奨
                      </div>
                    )}
                    <input
                      type="radio"
                      name="importStrategy"
                      value="create"
                      checked={importStrategy === 'create'}
                      onChange={(e) => setImportStrategy(e.target.value as 'create' | 'update' | 'skip')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium">新規作成のみ</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">重複時はエラーとする</div>
                    </div>
                  </label>
                  
                  <label className={`relative flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    duplicateAnalysis?.recommended_strategy === 'update'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                    {duplicateAnalysis?.recommended_strategy === 'update' && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        推奨
                      </div>
                    )}
                    <input
                      type="radio"
                      name="importStrategy"
                      value="update"
                      checked={importStrategy === 'update'}
                      onChange={(e) => setImportStrategy(e.target.value as 'create' | 'update' | 'skip')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium">更新優先</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">既存データを上書き</div>
                    </div>
                  </label>
                  
                  <label className={`relative flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    duplicateAnalysis?.recommended_strategy === 'skip'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                    {duplicateAnalysis?.recommended_strategy === 'skip' && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        推奨
                      </div>
                    )}
                    <input
                      type="radio"
                      name="importStrategy"
                      value="skip"
                      checked={importStrategy === 'skip'}
                      onChange={(e) => setImportStrategy(e.target.value as 'create' | 'update' | 'skip')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium">スキップ</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">重複データは無視</div>
                    </div>
                  </label>
                </div>
              </div>

              {csvPreview && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">インポート予定データ</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">ファイル名:</span>
                      <span className="ml-2 font-medium">{file?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">データ行数:</span>
                      <span className="ml-2 font-medium">{csvPreview.totalRows}行</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600 dark:text-gray-400">処理戦略:</span>
                      <Badge variant="default" className="ml-2">
                        {importStrategy === 'create' ? '新規作成のみ' :
                         importStrategy === 'update' ? '更新優先' : 'スキップ'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <div className="space-y-6">
            {importResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    インポート結果
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {importResult.results && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <button
                        onClick={() => setShowDetails(showDetails === 'imported' ? null : 'imported')}
                        disabled={importResult.results.imported === 0}
                        className={`text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg transition-all duration-200 ${
                          importResult.results.imported > 0 
                            ? 'hover:bg-green-100 dark:hover:bg-green-900/40 cursor-pointer' 
                            : 'opacity-50 cursor-not-allowed'
                        } ${showDetails === 'imported' ? 'ring-2 ring-green-500' : ''}`}
                      >
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {importResult.results.imported}
                        </div>
                        <div className="text-sm text-green-600 dark:text-green-400">新規作成</div>
                        {importResult.results.imported > 0 && (
                          <div className="text-xs text-green-500 dark:text-green-400 mt-1">クリックで詳細</div>
                        )}
                      </button>
                      
                      <button
                        onClick={() => setShowDetails(showDetails === 'updated' ? null : 'updated')}
                        disabled={importResult.results.updated === 0}
                        className={`text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-all duration-200 ${
                          importResult.results.updated > 0 
                            ? 'hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer' 
                            : 'opacity-50 cursor-not-allowed'
                        } ${showDetails === 'updated' ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {importResult.results.updated}
                        </div>
                        <div className="text-sm text-blue-600 dark:text-blue-400">更新</div>
                        {importResult.results.updated > 0 && (
                          <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">クリックで詳細</div>
                        )}
                      </button>
                      
                      <button
                        onClick={() => setShowDetails(showDetails === 'skipped' ? null : 'skipped')}
                        disabled={importResult.results.skipped === 0}
                        className={`text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg transition-all duration-200 ${
                          importResult.results.skipped > 0 
                            ? 'hover:bg-yellow-100 dark:hover:bg-yellow-900/40 cursor-pointer' 
                            : 'opacity-50 cursor-not-allowed'
                        } ${showDetails === 'skipped' ? 'ring-2 ring-yellow-500' : ''}`}
                      >
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {importResult.results.skipped}
                        </div>
                        <div className="text-sm text-yellow-600 dark:text-yellow-400">スキップ</div>
                        {importResult.results.skipped > 0 && (
                          <div className="text-xs text-yellow-500 dark:text-yellow-400 mt-1">クリックで詳細</div>
                        )}
                      </button>
                      
                      <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {importResult.results.errors}
                        </div>
                        <div className="text-sm text-red-600 dark:text-red-400">エラー</div>
                      </div>
                    </div>
                  )}
                  
                  {importResult.results && (
                    <div className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-400">
                      戦略: <Badge variant="default" className="ml-2">
                        {importResult.results.strategy === 'create' ? '新規作成のみ' :
                         importResult.results.strategy === 'update' ? '更新優先' : 'スキップ'}
                      </Badge>
                      <span className="ml-4">
                        合計処理件数: {importResult.results.total_processed}件
                      </span>
                    </div>
                  )}
                  
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">エラー詳細:</h4>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {importResult.errors.map((error, index) => (
                          <div key={index} className="bg-red-50 dark:bg-red-900/20 p-3 rounded border-l-4 border-red-400">
                            <div className="text-sm">
                              <span className="font-medium">行 {error.line}:</span> {error.error}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 詳細表示 */}
                  {showDetails && importResult.details && (
                    <div className="mt-6">
                      {showDetails === 'imported' && importResult.details.imported_users.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            新規作成されたユーザー ({importResult.details.imported_users.length}件)
                          </h4>
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {importResult.details.imported_users.map((user, index) => (
                              <div key={index} className="bg-green-50 dark:bg-green-900/20 p-3 rounded border-l-4 border-green-400">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-medium">{user.name}</span>
                                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">({user.email})</span>
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    <span>行 {user.line}</span>
                                    <span className="ml-2">ID: {user.id}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {showDetails === 'updated' && importResult.details.updated_users.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            更新されたユーザー ({importResult.details.updated_users.length}件)
                          </h4>
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {importResult.details.updated_users.map((user, index) => (
                              <div key={index} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border-l-4 border-blue-400">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-medium">{user.name}</span>
                                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">({user.email})</span>
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    <span>行 {user.line}</span>
                                    <span className="ml-2">ID: {user.id}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {showDetails === 'skipped' && importResult.details.skipped_users.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            スキップされたユーザー ({importResult.details.skipped_users.length}件)
                          </h4>
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {importResult.details.skipped_users.map((user, index) => (
                              <div key={index} className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border-l-4 border-yellow-400">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-medium">{user.name}</span>
                                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">({user.email})</span>
                                  </div>
                                  <div className="text-sm text-gray-500">行 {user.line}</div>
                                </div>
                                <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">{user.reason}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-light text-gray-900 dark:text-white">CSVユーザーインポート</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            ステップに従ってCSVファイルからユーザーデータを一括インポートします
          </p>
        </div>
        <Link href="/users/list">
          <Button variant="outline">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            一覧に戻る
          </Button>
        </Link>
      </div>

      {/* ステップインジケーター */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div 
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
                    ${currentStep === step 
                      ? 'bg-blue-500 text-white shadow-lg' 
                      : currentStep > step 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  {currentStep > step ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step
                  )}
                </div>
                <div className="ml-3 hidden sm:block">
                  <div className={`text-sm font-medium ${currentStep === step ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    Step {step}
                  </div>
                  <div className={`text-xs ${currentStep === step ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {stepInfo[step as keyof typeof stepInfo].title}
                  </div>
                </div>
                {step < 4 && (
                  <div className={`hidden sm:block w-12 h-0.5 ml-4 ${currentStep > step ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
            ))}
          </div>
          
          {/* 現在のステップの説明 */}
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {stepInfo[currentStep].title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {stepInfo[currentStep].description}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* エラーメッセージ */}
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <p className="font-medium mb-1">エラー</p>
              <p>{error}</p>
            </div>
          </div>
        </Alert>
      )}

      {/* 成功メッセージ */}
      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <p className="font-medium mb-1">成功</p>
              <p>{success}</p>
            </div>
          </div>
        </Alert>
      )}

      {/* ステップコンテンツ */}
      {currentStep === 3 ? (
        <form onSubmit={handleSubmit}>
          {renderStepContent()}
          
          {/* ナビゲーションボタン - Step 3 のみフォーム内 */}
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => goToStep(2)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              戻る
            </Button>
            
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !canProceedToStep(3)}
              isLoading={loading}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {loading ? "インポート中..." : "インポート実行"}
            </Button>
          </div>
        </form>
      ) : (
        <>
          {renderStepContent()}
          
          {/* ナビゲーションボタン - Step 1, 2, 4 はフォーム外 */}
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => currentStep > 1 ? goToStep((currentStep - 1) as 1 | 2 | 3 | 4) : null}
              disabled={currentStep === 1}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              戻る
            </Button>
            
            <div className="flex gap-3">
              {currentStep === 4 ? (
                <Button type="button" variant="outline" onClick={resetImport}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  新しいインポート
                </Button>
              ) : currentStep === 2 ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={true}
                >
                  上記の重複チェックを実行してください
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => canProceedToStep(currentStep + 1) ? goToStep((currentStep + 1) as 2 | 3 | 4) : null}
                  disabled={!canProceedToStep(currentStep + 1)}
                >
                  次へ
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}