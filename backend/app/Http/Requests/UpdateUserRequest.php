<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('id') ?? $this->route('user');

        return [
            'name' => 'sometimes|required|string|max:255',
            'email' => [
                'sometimes', 'required', 'string', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'password' => ['nullable', 'string', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()],
            'phone_number' => ['nullable', 'string', 'regex:/^\+?[0-9]{1,4}[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/'],
            'address' => 'nullable|string|max:255',
            'birth_date' => 'nullable|date_format:Y-m-d',
            'gender' => 'nullable|in:male,female,other',
            'membership_status' => 'nullable|in:active,inactive,pending,expired',
            'notes' => 'nullable|string|max:2000',
            'profile_image' => 'nullable|url|active_url',
        ];
    }
}
