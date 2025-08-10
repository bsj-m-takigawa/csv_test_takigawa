<?php

namespace App\Support;

class QueryHelper
{
    public static function escapeLike(string $value, string $escapeChar = '\\'): string
    {
        return str_replace(
            [$escapeChar, '%', '_'],
            [$escapeChar.$escapeChar, $escapeChar.'%', $escapeChar.'_'],
            $value
        );
    }
}
