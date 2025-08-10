<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_user(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $userData = [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Test@1234',  // 大文字小文字、数字、記号を含む8文字以上
            'password_confirmation' => 'Test@1234',
        ];

        $response = $this->postJson('/api/users', $userData);

        $response->assertStatus(201)
            ->assertJsonFragment(['email' => 'test@example.com']);
        $this->assertDatabaseHas('users', ['email' => 'test@example.com']);
    }

    public function test_can_update_user(): void
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

        $user = User::factory()->create();

        $updateData = ['name' => 'Updated Name'];

        $response = $this->putJson("/api/users/{$user->id}", $updateData);

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Updated Name']);
        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'Updated Name']);
    }

    public function test_can_delete_user(): void
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

        $user = User::factory()->create();

        $response = $this->deleteJson("/api/users/{$user->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_can_show_user(): void
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

        $user = User::factory()->create();

        $response = $this->getJson("/api/users/{$user->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $user->id]);
    }

    public function test_create_user_validation_fails(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/users', ['name' => 'Test']);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }
}
