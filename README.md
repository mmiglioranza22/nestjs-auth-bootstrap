# NestJS Auth bootstrap template

Speed up your development and your time to market with a transparent JWT authentication solution.

<!-- ([Check it in action here]())  upload video-->

### Index

1. [Why?](https://github.com/mmiglioranza22/nestjs-auth-bootstrap/blob/main/README.md#why)
2. [Who is this for?](https://github.com/mmiglioranza22/nestjs-auth-bootstrap/blob/main/README.md#who-is-this-for)
3. [What can you do with this?](https://github.com/mmiglioranza22/nestjs-auth-bootstrap/blob/main/README.md#what-can-you-do-with-this)
4. [What's included?](https://github.com/mmiglioranza22/nestjs-auth-bootstrap/blob/main/README.md#whats-included)
5. [Why JWT?](https://github.com/mmiglioranza22/nestjs-auth-bootstrap/blob/main/README.md#why-jwt)
6. [Development](https://github.com/mmiglioranza22/nestjs-auth-bootstrap/blob/main/README.md#development)
7. [Testing](https://github.com/mmiglioranza22/nestjs-auth-bootstrap/blob/main/README.md#testing)
8. [Auth cycle](https://github.com/mmiglioranza22/nestjs-auth-bootstrap/blob/main/README.md#auth-cycle)
9. [A note on user roles (specific to this template)](https://github.com/mmiglioranza22/nestjs-auth-bootstrap/blob/main/README.md#a-note-on-user-roles)

## Why?

This was developed during a larger project and it seemed to be a monster of its own that could be useful for anybody struggling with authentication and authorization in NestJS.

You can roll your own auth and develop everything from scratch (which I certainly encourage you to do), with all the time and pain that involves (which is totally worth it, yet maybe not for someone that needs an auth solution with urgency).

You can delegate authentication to battle-tested solutions with third-party packages. You trust them they do all the heavy lifting for you and taking advantage of the free plans while they last, and you are willing to spend the time it will take to understand the docs (a learning curve that not everybody wants to go through).

Or you can try this template if you just want to see the code and be able to tinker with it without paying a dime while always having the control over your own auth flow. No subscription, no free or premium plans, just the code.

## Who is this for?

1. _You are developing a backend application with NestJS for any kind of project. You finally need to manage authorization and authentication, you don't have a clue how to do so or you don't have a preferred solution to that problem, might as well try one already implemented and tested._

2. _You just want something to work out of the box and don't mind adjusting some configs ([explained below](https://github.com/mmiglioranza22/nestjs-auth-bootstrap/tree/main?tab=readme-ov-file#requirements)). You also want the freedom to expand and discard what you don't need for your particular project. (You can use this as a skeleton for your custom authentication strategy: sessions, api keys, choose your pick)._

3. _You want a solution you can test fast and ship faster without third-party solutions. You want to keep control over everything (token cache store, user roles, credentials recovery, account verification, etc) while still being able to customize it to your needs._

4. _Security is paramaount to your application and you need a scalable and performant solution that will not become a bottleneck in the future. You likely work with more than one application in your system, or you know for a fact that the system you are or will be developing is of a distributed nature._

5. _Your application uses REST (you could adapt it to your need, but know quite a lot of refactor could be needed)_

## What can you do with this?

Whatever you want.

You can use it as is, developr your own authentication strategy to your use case, extend it and implement your own token reuse detection solution (to enable multiple device login for example or blacklist used access token), remove any module you do not use and modify what you need, check how tests are setup and configured for NestJS (not a particularly trivial endeavour), add observability and monitoring to see how it scales, convert it into your own auth micro service, play around trying to crack it and find vulnerabilities unknown until now (you can submit them if you do!)

License is MIT

## What's included?

- Basic `User` and `Role` entities (**TypeORM** implementation)
  <br>
- **JWT** based authentication strategy implemented:
  <br>
  - `accessToken` in response body for client manipulation.
    <br>
  - `Authorization` cookie with refresh token (`HttpOnly`, `SameSite`, `Secure`, `Signed`).
    <br>
- Signed Double CSRF Cookie pattern implementation:
  <br>
  - `x-csrf-token` header and `__Host-csrf` cookie token
    <br>
- Cache store for token rotation on each token revalidation and user logout (**Redis** implementation)
  <br>
- Docker compose files to work with your development and test environments
  <br>
- Unit and integration testing (Vitest + [Testcontainers](https://testcontainers.com/)). (Optional docker compose tests too if you don't want to use Testcontainers)
  <br>
- Basic mail service (**`nodemailer`** solution. You can configure it or change it completely for a different provider)
  <br>
- Swagger docs (`api/swagger`)
  <br>
- Basic **`Throttler`** module (mainly useful for production environment. Configure it for your use case)
  <br>
- Basic **`ClsModule`** module (for [request identification](https://papooch.github.io/nestjs-cls/features-and-use-cases/request-id), should you want to monitor specific requests or share context easily)
  <br>
- `LoggerModule` with [`nestjs-pino`](https://github.com/iamolegga/nestjs-pino). (Optional: change log level at runtime)
  <br>
- [Postman collection](https://www.postman.com/orbital-module-astronomer-66959558/nestjs-auth-bootstrap/collection/16327695-aa18b690-8419-4a22-a824-81af4fae7c19) for faster development and manual testing (environment and pre/post scripts configured)
  <br>
- **Seed service** for fast development setup
  <br>
- Tons of comments that explain how things work if you get lost
  <br>

Least but most important, **the ability to modify any of the above to fit your specific needs**. That said, the template `**CORS**` configuration might not be the one you need **and it is up to you to configure it (just passing the options you want)**

## Why [JWT](https://youtu.be/P2CPd9ynFLg?si=mKVvy1h3_ERcrF6W)?

Before any claim or objection is pointed out, know that like most things in programming, **all authentication solutions have their own tradeoffs and usecases**.

There are no silver bullets, just less worse solutions which can be improved significantly when their common pitfalls are addressed (which this template attempts to do).

You will come across several resources and opinions that state that JWT is far too complicated for simple MVPs or POCs when deciding how to solve authentication, or that is not inteded at all for authentication. And partly those opinions are true because getting it right is not a trivial matter and JWT are not ideal for all usecases. Centralized authentication solutions (like sessions) can be far better for other projects that do not talk with other applications, have low to moderate traffic, require instant access revocation, or any other reason that makes JWT not suitable.

Some sensible objections to JWT that were addressed in this project are:

1. _**JWT can't be revoked on logout**_:

This is the reason why JWT good practices encourage to make them short lived (minutes). And still, for a small time window those JWT will remain valid. **However**, this template ensures that once the user logouts, subsequent requests to protected routes (POST, PATCH, DELETE) will result in `Unauthorized` `401` responses.

The same thing is done should the user be revoked access while still being logged. This is achieved by keeping track of currently logged users in a cache store (like a session storage used for refresh tokens) and making all sensible routes `@Protected`. Read-only routes (GET) will still be accessible for the short lifetime of the access token (which you could just solve by changing `@Private` routes to `@Protected`).

Token rotation on login, logout, token revalidation, user deletion or specific user access revocation ensures all protected routes are inaccessible **immediately** and private routes only accesible for the remaining lifespan of the access token.

2. _**JWT are not safe as they can be read by anyone**_:

This is part of the specification for JWT and the reason why tokens in this template only send the minimal information required for the application to work properly without leaking anything related to **authorization** (user roles). Security for JWT transmission does not rely on encryption as no sensible claims should be sent to the client (you can expand this template's solution to use JWE if you need to share sensible claims in each token). Rather, JWT remain safe and secure as long as:

- they are signed with a strong secret that is stored securely
- use short expiration time
- are transmitted by `https` (which should be the default for any type of communication, not just JWTs)
- stored by the client in signed, secure `httpOnly` cookies (preventing Cross-Site Scripting)

The interface used for access tokens only use the `sub` property. Refresh tokens add an extra `check` property used check its respective hash which is stored in cache (You can make this validation process even faster by just storing and checking the plain `check` value)

<br>

```ts
export interface JwtPayload {
  sub: string;
  check?: string;
}
```

<br>

3. _**JWT are not suited for fine grain control**_:

Each project handles authorization differently (this template uses **role based** authorization without using JWT for that). Read the [second point](https://github.com/mmiglioranza22/nestjs-auth-bootstrap/edit/main/README.md#:~:text=66-,67,-68) listed above: JWT are used here for authentication (granting access based on who the user is), hence they remain slim and reveal no information whatsoever of which resources can be accessed or which permissions are granted to a specific user (Which might not be just the usecase for your project. Adapt accordingly)

4. _**Still JWT are not safe against CSRF threats, they are useless against them!**_:

These claims stem from those how do not understand the purpose of JWTs, the same way someone would state a screwdriver is usless for the purpose of hammering nails: it is just not the tool for that.

CSRF threats are addressed by CSRF specific solutions, which this template conveniently has by implementing the signed double submit CSRF pattern. This implementation was developed with AI and tested for common pitfalls (timing attacks for different token lengths) and is transparent for you to check it out, enhance or modify it completely. You can check how it was developed [here](https://github.com/mmiglioranza22/chatgptools/blob/fcaff05045a8751c65779681496577279be8bfc0/csrf_utils/README.md)

Not satisfied with the provided CSRF solution? You can reuse most components and implement [`csrf-csrf`](https://github.com/Psifi-Solutions/csrf-csrf) yourself

<br>

## Development

#### Requirements

- Docker (4.57.0)
- Node (24.13.0)
- Volta (optional)

After cloning the repository, you should create an `.env.development` file with your own variables using the template provided in the `/config` directory (env file must be located in that directory unless you modify how you want docker compose to look for it)

```
pnpm i
docker compose -f docker-compose.dev.yaml up -d
pnpm run start:dev
```

or my favourite

```
docker compose -f docker-compose.dev.yaml down && docker compose -f docker-compose.dev.yaml up -d && pnpm run start:dev
```

Development server listens to `localhost:3000/api`. Swagger docs: `localhost:3000/api/swagger`

Open [Postman collection](https://www.postman.com/orbital-module-astronomer-66959558/nestjs-auth-bootstrap/collection/16327695-aa18b690-8419-4a22-a824-81af4fae7c19) and you are all set.

<br>

#### Mail service configuration

If you wish to use the implemented **nodemailer** solution, you must create your own account and configure environment variables `MAILTRAP_HOST, MAILTRAP_PORT, MAILTRAP_USER, MAILTRAP_PASSWORD`.
Refer to [mailtrap.io](https://mailtrap.io/) docs to set up your own configuration (sandbox tab)

<br>

#### Troubleshooting - Notice on first time running `postgres` containers

Postgres demands `POSTGRES_PASSWORD` variable to be set on the first time docker compose runs. Although this is done by TypeORM when initializing the application, the password variable at the time the container starts up is not available (It then reads the variable from the `.env.development` file).

Docker needs to read these variables from an `.env` file on startup.

`.env` file is added in this repository for easy testing and development.

<br>

🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨
🚨🚨 **If you eventually use your own variables, REMEMBER TO ADD `.env` TO YOUR `.gitignore` FILE.** 🚨🚨
🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨

This is merely a development issue. For a production release, use the strategy that best suits your CI/CD to prevent using an `.env` file with secrets

<br>

## Testing

Requests logs are enabled by default for integration tests. Error logs are disabled by default (you can enable it by changing this condition [here](https://github.com/mmiglioranza22/nestjs-auth-bootstrap/blob/9c70227a4950a985caeff8b610362eefb50da107/src/common/filters/global-exception.filter.ts#L54))

Use `DEBUG=testcontainers*` if you want to check logs when using test containers

If you dont want to use Testcontainers for integration testing, you only need to remove all "Sanity check" tests and logic related to `TestContainersSetup` helper class, and then run:

```
docker compose -f docker-compose.test.yaml down && docker compose -f docker-compose.test.yaml up -d && npx vitest run int
```

<br>

## Auth cycle

JWT access token is used for stateless authentication. JWT refresh token used for token revalidation.
Refresh token is stored in cache for token rotation and invalidation. Its key is a random uuid that contains the users information: id, roles and active status.
CSRF token is used as an extra layer of security, in a signed double submission pattern (regular cookie + http header)

`/login` and `/auth/revalidate-credentials` rotates cached tokens.

Accessing `private` routes relies only on valid access token (Authentication check)
Accessing `protected` routes adds csrf token validation plus user's status and role (Authorization check)

`/auth/logout`, user invalidation / modification that denies access, same as valid requests for password change invalidate refresh tokens, forbidding access to protected routes, yet keeping access to private routes for the lifetime of access token (short lived).

Csrf token are rotated on login, revalidate-credentials (alongside access/refresh tokens) and logout. They are otherwise valid per user session until access token expires (which forces all token rotation).

```mermaid
sequenceDiagram
participant c as browser (app)
participant s as server (app)

    Note over c,s: Public endpoints (api/auth)
	c->>s : POST /signup
    activate s
	Note right of s: - Creates user<br> - Sends verification email
    s-->>c : 200 OK
    deactivate s

    c->>s: GET /verify-account?token=123
    activate s
    Note right of s: - Query user with token <br> - Flags user if valid (verifiedAccount)
    s-->>c: 200 OK
    deactivate s

    c->>s: POST /login
    activate s
    Note right of s: - Query user and check credentials <br> - Generates token if valid<br> - Sets cookies and returns access token
    s-->>c: 200 OK : { accessToken }
    deactivate s

    c->>s: GET /logout
    activate s
    Note right of s: - Revokes refresh token (db delete) <br> - Clears cookies (httpOnly) <br> - Clears cache
    s-->>c: 200 OK
    deactivate s

    c->>s: GET /revalidate-credentials
    Note over c: Access token expired <br> (auth by cookies)
    activate s
    Note right of s: - Queries refresh token <br> - Deletes old token and create new user tokens <br> - Returns new user tokens <br> - Sets new cookies <br> - Updates cache
    s-->>c: 200 OK { accessToken }
    deactivate s

    c->>s: POST /recover-credentials
    activate s
    Note right of s: - Queries user <br> - Clear previous tokens (refresh and recovery) <br> - Clears cache <br> - Sends recovery email
    s-->>c: 200 OK
    deactivate s

    c->>s: POST /reset-password
    Note over c: Send new password and recovery token <br>(sent through /recover-credentials)
    activate s
    Note right of s: - Checks if recovery token is valid <br> - Queries user, changes new password <br> - Clear cache and delete tokens
    s-->>c: 200 OK
    deactivate s


	% TODO check if changes (specially cache/token/cookies deletion)
```

## A note on user roles

This template relies on user roles for authorization, you can modify it to use any other way you deem more fit to your needs, still taking advantage of the `@Private` and `@Protected` guards used (Policy-based, claims-based, etc).

That being said, user roles work like this:

[x] There can only exist one user related role (sysadmin, admin, user, guest).

[x] Sysadmin can assign any role, to themselves or other users.

[x] Admins can only assign admin roles and less priviledge roles, to themselves or other users.

[x] Users with plain user and guest roles can't modify any of their own roles, nor modify other users roles

[x] Personal data (like email and password) can only be modified by the users that are affected (Sysadmin can't modify these, yet it can revoke all access/delete any user).

# Special thanks

I will be adding a list of all the resources I used here. This project was made possible in great part thanks to them:

- [NestJS official docs](https://docs.nestjs.com/)
- [DevTalles Curso NestJS](https://cursos.devtalles.com/courses/nest)
- [DevTalles Curso NesJS + Testing](https://cursos.devtalles.com/courses/NestJS-Testing)
- [Computerix NestJS playlist](https://www.youtube.com/watch?v=bP7CFznd8o0&list=PLHVUNsO6sqSpeFjQBl1KZMYEI-IL5idqZ)
- [WittCode Security playlist](https://www.youtube.com/watch?v=PbzvureDBJw&list=PLkqiWyX-_Losd0Qc584EcU2A1aHvF7Snc), in particular videos related to JWT access and refresh tokens, CSRF.
- [WebDevSimplified video on CSRF tokens](https://youtu.be/80S8h5hEwTY?si=18kkrUlcDakpKm_f)
