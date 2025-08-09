<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaginationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
    }

    public function test_default_pagination()
    {
        User::factory()->count(30)->create();

        $res = $this->getJson('/api/users');
        $res->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'meta' => ['total', 'current_page', 'per_page', 'last_page', 'from', 'to'],
                'links' => ['first', 'last', 'prev', 'next'],
            ]);

        $json = $res->json();
        $this->assertCount(20, $json['data']);
        $this->assertEquals(30, $json['meta']['total']);
        $this->assertEquals(1, $json['meta']['current_page']);
        $this->assertEquals(20, $json['meta']['per_page']);
        $this->assertEquals(2, $json['meta']['last_page']);
    }

    public function test_pagination_params_and_sorting()
    {
        User::factory()->count(55)->create();

        $res = $this->getJson('/api/users?page=2&per_page=10&sort=created_at&order=desc');
        $res->assertStatus(200);

        $json = $res->json();
        $this->assertCount(10, $json['data']);
        $this->assertEquals(55, $json['meta']['total']);
        $this->assertEquals(2, $json['meta']['current_page']);
        $this->assertEquals(10, $json['meta']['per_page']);
        $this->assertEquals(6, $json['meta']['last_page']);
    }

    public function test_query_filtering()
    {
        User::factory()->create(['name' => 'Taro Example', 'email' => 'taro@example.com']);
        User::factory()->create(['name' => 'Jiro Sample', 'email' => 'jiro@example.com']);

        $res = $this->getJson('/api/users?q=taro');
        $res->assertStatus(200);

        $json = $res->json();
        $this->assertNotEmpty($json['data']);
        foreach ($json['data'] as $u) {
            $this->assertTrue(stripos($u['name'], 'taro') !== false || stripos($u['email'], 'taro') !== false);
        }
    }

    public function test_validation_errors()
    {
        $res = $this->getJson('/api/users?page=0&per_page=1000&sort=invalid&order=down');
        $res->assertStatus(422)
            ->assertJsonStructure([
                'message',
                'errors',
            ]);
    }
}
