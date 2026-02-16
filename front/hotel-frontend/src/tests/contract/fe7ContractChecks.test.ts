/**
 * @vitest-environment node
 */
/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const FE7_FILES = [
    'src/pages/Dashboard.tsx',
    'src/pages/Occupancy.tsx',
    'src/pages/Financials.tsx',
    'src/api/dashboard.ts',
    'src/hooks/dashboard/useDashboard.ts',
    'src/hooks/dashboard/useOccupancy.ts',
    'src/hooks/dashboard/useRevenueSummary.ts'
];

interface ForbiddenCalculation {
    pattern: RegExp;
    label: string;
    skipComment: string;
}

const FORBIDDEN_CALCULATIONS: ForbiddenCalculation[] = [
    {
        pattern: /revenue\s*\/\s*soldRoomNights/i,
        label: 'ADR (revenue / soldRoomNights)',
        skipComment: '// CLIENT_CALCULATED_OK'
    },
    {
        pattern: /revenue\s*\/\s*totalRooms/i,
        label: 'RevPAR (revenue / totalRooms)',
        skipComment: '// CLIENT_CALCULATED_OK'
    },
    {
        pattern: /soldRoomNights\s*\/\s*supplyRoomNights/i,
        label: 'Occupancy Rate (soldRoomNights / supplyRoomNights)',
        skipComment: '// CLIENT_CALCULATED_OK'
    },
    {
        pattern: /occupiedRooms\s*>\s*availableRooms/i,
        label: 'Overbooked inference (occupied > available)',
        skipComment: '// BACKEND_NOT_PROVIDING_OVERBOOK_FLAG_OK'
    },
    {
        pattern: /occupiedRooms\s*>\s*totalRooms/i,
        label: 'Overbooked inference (occupied > total)',
        skipComment: '// BACKEND_NOT_PROVIDING_OVERBOOK_FLAG_OK'
    }
];

describe('FE-7 Contract Checks (Static)', () => {
    FE7_FILES.forEach((filePath: string) => {
        const fullPath = path.resolve(process.cwd(), filePath);

        it(`should not contain forbidden client-side calculations in ${filePath}`, () => {
            expect(fs.existsSync(fullPath), `File not found: ${fullPath}`).toBe(true);

            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');

            FORBIDDEN_CALCULATIONS.forEach(({ pattern, label, skipComment }) => {
                lines.forEach((line: string, index: number) => {
                    if (pattern.test(line)) {
                        const prevLine = index > 0 ? lines[index - 1] : '';
                        if (!line.includes(skipComment) && !prevLine.includes(skipComment)) {
                            throw new Error(
                                `Forbidden calculation found at ${filePath}:${index + 1}: "${line.trim()}"\n` +
                                `Calculation: ${label}\n` +
                                `To allow this, add comment: ${skipComment}`
                            );
                        }
                    }
                });
            });
        });
    });
});
