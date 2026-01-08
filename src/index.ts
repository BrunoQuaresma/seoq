#!/usr/bin/env node

import { Command } from "commander";
import { analyzeCommand } from "./commands/analyze.js";
import { keywordsCommand } from "./commands/keywords.js";
import { competitorsCommand } from "./commands/competitors.js";
import { compareCommand } from "./commands/compare.js";

const program = new Command();

program
  .name("seoq")
  .description("A TypeScript CLI tool built with commander")
  .version("1.0.0");

program.addCommand(analyzeCommand);
program.addCommand(keywordsCommand);
program.addCommand(competitorsCommand);
program.addCommand(compareCommand);

program.parse();
