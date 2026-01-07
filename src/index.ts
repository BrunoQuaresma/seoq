#!/usr/bin/env node

import { Command } from "commander";
import { analyzeCommand } from "./commands/analyze.js";

const program = new Command();

program
  .name("seoq")
  .description("A TypeScript CLI tool built with commander")
  .version("1.0.0");

program.addCommand(analyzeCommand);

program.parse();
