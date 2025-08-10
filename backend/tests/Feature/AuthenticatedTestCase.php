<?php

namespace Tests\Feature;

use App\Models\User;
use Laravel\Sanctum\Sanctum;

trait AuthenticatedTestCase
{
    protected function authenticateUser(): User
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        return $user;
    }
}