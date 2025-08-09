<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Support\QueryHelper;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone_number',
        'address',
        'birth_date',
        'gender',
        'notes',
        'profile_image',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    /**
     * Scope a query to apply keyword search across name, email and phone number.
     */
    public function scopeSearch(Builder $query, string $q): Builder
    {
        if ($q === '') {
            return $query;
        }

        if (config('database.default') === 'mysql') {
            return $query->whereFullText(['name', 'email', 'phone_number'], $q);
        }

        $escaped = QueryHelper::escapeLike($q);
        $like = "%{$escaped}%";

        return $query->where(function (Builder $sub) use ($like) {
            $sub->whereRaw("name LIKE ? ESCAPE '\\'", [$like])
                ->orWhereRaw("email LIKE ? ESCAPE '\\'", [$like])
                ->orWhereRaw("phone_number LIKE ? ESCAPE '\\'", [$like]);
        });
    }
}
