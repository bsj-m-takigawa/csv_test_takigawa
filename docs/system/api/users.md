# Users API

Base: /api

## Endpoints
- GET /users?page={n}&per_page={m}&sort={field}&order={asc|desc}&q={keyword}
- GET /users/{id}
- POST /users
- PUT /users/{id}
- DELETE /users/{id}

## Request/Validation
- Create: name, email, password(confirmed), optional phone/address/birth_date/gender/membership_status/notes/profile_image
- Update: same, all optional; email unique except self; password optional if provided confirmed
- Forbidden: points from public endpoints

## Responses
- 200/201: user or paginated list {data[], meta{total,page,per_page,pages}}
- 404: {message}
- 422: {message, errors{...}}

## Notes
- Use Eloquent, avoid raw SQL
- Use FormRequest for validation
- Future: auth required for protected actions
