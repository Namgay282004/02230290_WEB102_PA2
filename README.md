## Requirements

- Node.js (v14+ recommended)
- npm or yarn
- PostgreSQL database (or any other supported by Prisma)
- TypeScript (optional but recommended for type safety)

## Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd 02230290_WEB102_PA2
   ```

2. **Install dependencies**:

    Using npm:

    ```
    npm install
    ```

    Using yarn:

    ```
    yarn install
    ```

3. **Set up environment variables**:

Create a .env file in the root of the project based on .env.example. Update it with your database connection string and any other necessary variables.

4. **Run database migrations**:

Ensure your database is set up and running. Then apply migrations to create tables defined in schema.prisma:

    ```
    npx prisma migrate dev --name init
    npx prisma db push
    ```

5. **Generate Prisma Client**:

Generate the Prisma Client to match your database schema:

    ```
    npx prisma generate
    ```

6. **Build and start the server**:
    ```
    npm run build
    npm run start
    # or
    yarn build
    yarn start
    ```

    The server should start at [Link](http://localhost:3000).

## API Documentation
### Authentication
- **POST /signup**

    - Create a new user account.
    - Request body: { "email": "example@example.com", "password": "yourpassword" }
    - Response: { "message": "User created successfully" } or { "message": "Email already exists" }

- **POST /signin**

    - Authenticate a user and receive a JWT token.
    - Request body: { "email": "example@example.com", "password": "yourpassword" }
    - Response: { "message": "Login successful", "token": "your.jwt.token" } or { "message": "Invalid credentials" }

### Pokemon Management

- **GET /pokemon/**
    - Fetch data for a specific Pokemon from PokeAPI.
    - Params: name - Name of the Pokemon.
    - Response: Pokemon data from PokeAPI.

### Protected Routes (Requires Authentication)
- **POST /protected/catch**

    - Log a caught Pokemon for the authenticated user.
    - Request body: { "name": "pokemon_name" }
    - Response: { "message": "Pokemon caught", "data": { ... } }

- **DELETE /protected/release/**

    - Release a caught Pokemon by its ID for the authenticated user.
    - Params: id - ID of the caught Pokemon.
    - Response: { "message": "Pokemon released" }

- **GET /protected/caught**

    - Retrieve all Pokemon caught by the authenticated user.
    - Response: { "data": [ { "pokemon": { ... } } ] }

