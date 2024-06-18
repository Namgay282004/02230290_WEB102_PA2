import { Hono } from "hono";
import { cors } from "hono/cors";
import { PrismaClient, Prisma } from "@prisma/client";
import { HTTPException } from "hono/http-exception";
import { sign } from "jsonwebtoken";
import axios from "axios";
import { jwt } from 'hono/jwt';
import { rateLimiter } from "hono-rate-limiter";
import type { JwtVariables } from 'hono/jwt';

// Defines type alias for clarity
type Variables = JwtVariables;

// Initializes Hono app and Prisma client
const app = new Hono<{ Variables: Variables }>();
const prisma = new PrismaClient();

// Enables CORS globally
app.use("/*", cors());

// Creates a rate limiter instance
const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limits each IP to 100 requests per window
  standardHeaders: "draft-6", // draft-6: `RateLimit-*` headers
  keyGenerator: (c) => c.req.header('x-forwarded-for') || c.req.header('remote-addr') || '127.0.0.1', // Generates custom identifiers for clients based on IP
});

// Applies the rate limiting middleware to all requests.
app.use(limiter);

// Middleware for JWT authentication on protected routes
app.use(
  "/protected/*",
  jwt({
    secret: 'mySecretKey',
  })
);

// Endpoint for user signup
app.post("/signup", async (c) => {
  const body = await c.req.json();
  const email = body.email;
  const password = body.password;

  // Hash password using bcrypt 
  const bcryptHash = await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 4,
  });

  try {
    // Creates user in the database
    const user = await prisma.user.create({
      data: {
        email: email,
        hashedPassword: bcryptHash,
      },
    });

    return c.json({ message: `${user.email} created successfully` });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return c.json({ message: "Email already exists" });
      }
    }
    // Handling other errors
    throw new HTTPException(500, { message: "Internal Server Error" });
  }
});

// Endpoint for user signin
app.post("/signin", async (c) => {
  const body = await c.req.json();
  const email = body.email;
  const password = body.password;

  // Finds user by email
  const user = await prisma.user.findUnique({
    where: { email: email },
    select: { id: true, hashedPassword: true },
  });

  if (!user) {
    return c.json({ message: "User not found" }, 404);
  }

  // Verifies password
  const match = await Bun.password.verify(
    password,
    user.hashedPassword,
    "bcrypt"
  );

  if (match) {
    // Generates JWT token upon successful login
    const payload = {
      sub: user.id,
      exp: Math.floor(Date.now() / 1000) + 60 * 20, // Token expires in 20 minutes
    };
    const secret = "mySecretKey";
    const token = sign(payload, secret);
    return c.json({ message: "Login successful", token: token });
  } else {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
});

// Endpoint to fetch Pokemon data from PokeAPI
app.get("/pokemon/:name", async (c) => {
  const { name } = c.req.param();

  try {
    // Fetch data from PokeAPI
    const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${name}`);
    return c.json({ data: response.data });
  } catch (error) {
    return c.json({ message: "Pokemon not found" }, 404);
  }
});

// Endpoint to fetch all caught Pokemon for the user (protected route)
app.get("/protected/caught", async (c) => {
  const payload = c.get('jwtPayload');
  if (!payload) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  // Retrieves all caught Pokemon for the user
  const caughtPokemon = await prisma.caughtPokemon.findMany({
    where: { userId: payload.sub },
    include: { pokemon: true } 
  });

  return c.json({ data: caughtPokemon });
});

// Endpoint to allow users to catch Pokemon (protected route)
app.post("/protected/catch", async (c) => {
  const payload = c.get('jwtPayload');
  if (!payload) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const body = await c.req.json();
  const pokemonName = body.name;

  // Finds or create Pokemon in database
  let pokemon = await prisma.pokemon.findUnique({ where: { name: pokemonName } });
  
  if (!pokemon) {
    pokemon = await prisma.pokemon.create({
      data: { name: pokemonName }
    });
  }

  // Records caught Pokemon for the user
  const caughtPokemon = await prisma.caughtPokemon.create({
    data: {
      userId: payload.sub,
      pokemonId: pokemon.id
    }
  });

  return c.json({ message: "Pokemon caught", data: caughtPokemon });
});

// Endpoint to update a caught Pokemon (protected route)
app.put("/protected/update/:id", async (c) => {
  const payload = c.get('jwtPayload');
  if (!payload) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const { id } = c.req.param();
  const body = await c.req.json();
  const { nickname } = body;

  // Updates the specified Pokemon in the user's collection
  const updatedPokemon = await prisma.caughtPokemon.updateMany({
    where: { id: id, userId: payload.sub },
    data: { nickname: nickname }
  });

  if (updatedPokemon.count === 0) {
    throw new HTTPException(404, { message: "Pokemon not found or not owned by user" });
  }

  return c.json({ message: "Pokemon updated", data: updatedPokemon });
});

// Endpoint to release a caught Pokemon (protected route)
app.delete("/protected/release/:id", async (c) => {
  const payload = c.get('jwtPayload');
  if (!payload) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const { id } = c.req.param();

  // Delete the specified Pokemon from the user's collection
  await prisma.caughtPokemon.deleteMany({
    where: { id: id, userId: payload.sub }
  });

  return c.json({ message: "Pokemon released" });
});

export default app;
