<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'phone_number' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'birth_date' => 'nullable|date_format:Y-m-d',
            'gender' => 'nullable|in:male,female,other',
            'membership_status' => 'nullable|in:active,inactive,pending,expired',
            'notes' => 'nullable|string|max:2000',
            'profile_image' => 'nullable|url',
        ];
    }
}
