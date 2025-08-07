<?php

require_once 'vendor/autoload.php';

use App\Http\Controllers\CsvController;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

// Initialize Laravel application
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $file = new UploadedFile(
        '/var/www/html/test_final.csv',
        'test_final.csv',
        'text/csv',
        null,
        true
    );

    $request = new Request;
    $request->files->set('csv_file', $file);
    $request->merge(['import_strategy' => 'create']);

    echo "Starting import test...\n";
    $controller = new CsvController;
    $result = $controller->import($request);
    echo 'Success: '.json_encode($result->getData())."\n";

} catch (Exception $e) {
    echo 'Error: '.$e->getMessage()."\n";
    echo 'File: '.$e->getFile().':'.$e->getLine()."\n";

    // Check for SQL errors specifically
    if (strpos($e->getMessage(), 'SQLSTATE') !== false || strpos($e->getMessage(), 'Incorrect datetime value') !== false) {
        echo "SQL Error detected. This is likely the ? character issue.\n";
        echo "Stack trace:\n".$e->getTraceAsString()."\n";
    }
}
