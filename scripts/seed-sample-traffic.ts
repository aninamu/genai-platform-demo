#!/usr/bin/env node
/**
 * Seeds labeled sample history into .data/traces.json (replaces earlier sample traces).
 * Run: pnpm seed:sample
 */
import { seedSampleTraffic } from "../lib/gateway";

const { inserted } = seedSampleTraffic();
console.log(`Seeded ${inserted} sample traces into .data/traces.json`);
