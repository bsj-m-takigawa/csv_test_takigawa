<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CompressResponseTest extends TestCase
{
    use RefreshDatabase;

    public function test_response_is_gzipped_when_client_accepts(): void
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

        User::factory()->count(50)->create();

        $response = $this->getJson('/api/users', ['Accept-Encoding' => 'gzip']);

        $response->assertStatus(200);
        $response->assertHeader('Content-Encoding', 'gzip');

        $compressed = $response->getContent();
        $decompressed = gzdecode($compressed);

        $this->assertNotFalse($decompressed);
        $this->assertJson($decompressed);
        $this->assertGreaterThan(strlen($compressed), strlen($decompressed));
    }

    public function test_response_is_not_gzipped_without_accept_encoding(): void
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

        User::factory()->count(50)->create();

        $response = $this->getJson('/api/users');

        $response->assertStatus(200);
        $response->assertHeaderMissing('Content-Encoding');
    }

    public function test_small_response_is_not_gzipped_even_if_client_accepts(): void
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

        User::factory()->create();

        $response = $this->getJson('/api/users', ['Accept-Encoding' => 'gzip']);

        $response->assertStatus(200);
        $response->assertHeaderMissing('Content-Encoding');
        $this->assertLessThan(1024, strlen($response->getContent()));
    }
}

