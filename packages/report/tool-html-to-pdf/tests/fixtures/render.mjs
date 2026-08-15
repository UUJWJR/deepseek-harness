// Test double for the html-to-pdf render.py: writes a stub PDF naming its input.
import { writeFileSync } from 'node:fs'

const outIndex = process.argv.indexOf('-o')
const output = process.argv[outIndex + 1]
const input = process.argv[2]
writeFileSync(output, 'PDF of ' + input)
