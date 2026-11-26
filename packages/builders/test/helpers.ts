import fs from 'node:fs';
import path from 'node:path';
import type { ValidationIssue, WebhookMessagePayload } from '../src/core';

export const fixtureNames = fs
  .readdirSync(path.join(import.meta.dirname, 'fixtures'))
  .filter((file) => file.endsWith('.json'))
  .map((file) => path.parse(file).name);

export const fixture = (name: string): WebhookMessagePayload =>
  JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'fixtures', `${name}.json`), 'utf8'));

export const errors = (issues: ValidationIssue[]) => issues.filter((issue) => issue.severity === 'error');

export const codes = (issues: ValidationIssue[]) => issues.map((issue) => issue.code);
