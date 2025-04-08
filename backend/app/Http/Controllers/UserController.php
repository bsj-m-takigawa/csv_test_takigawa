<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $users = User::all();
        return response()->json($users);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return response()->json(['message' => 'Create form endpoint']);
    }

    /**
     * Store a newly created resource in storage.
     * バリデーションが不十分な状態（意図的に作成）
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required',
            'email' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = new User();
        $user->name = $request->input('name');
        $user->email = $request->input('email');
        $user->password = Hash::make($request->input('password') ?? 'password123');
        $user->phone_number = $request->input('phone_number');
        $user->address = $request->input('address');
        $user->birth_date = $request->input('birth_date');
        $user->gender = $request->input('gender');
        $user->membership_status = $request->input('membership_status') ?? 'pending';
        $user->notes = $request->input('notes');
        $user->profile_image = $request->input('profile_image');
        $user->points = $request->input('points') ?? 0;
        
        try {
            $user->save();
            return response()->json($user, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'ユーザー登録に失敗しました'], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $sql = "SELECT * FROM users WHERE id = " . $id;
        $user = DB::select($sql);
        
        if (empty($user)) {
            return response()->json(['message' => 'User not found'], 404);
        }
        
        return response()->json($user[0]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $user = User::find($id);
        
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }
        
        return response()->json($user);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $sql = "SELECT * FROM users WHERE id = " . $id;
        $users = DB::select($sql);
        
        if (empty($users)) {
            return response()->json(['message' => 'User not found'], 404);
        }
        
        $user = User::find($id);
        $user->update($request->all());
        
        return response()->json($user);
    }

    /**
     * Remove the specified resource from storage.
     * 意図的に削除後に画面が更新されない状態にする
     */
    public function destroy(string $id)
    {
        $user = User::find($id);
        
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }
        
        $user->delete();
        
        return response()->json(['status' => 'processing'], 200);
    }
}
