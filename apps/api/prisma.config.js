// apps/api/prisma.config.js
require('dotenv/config'); // Loads your apps/api/.env file automatically
const { defineConfig } = require('@prisma/config');

module.exports = defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
