#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.program = void 0;
const commander_1 = require("commander");
const analyzer_1 = require("../safety/analyzer"); // This might need to be adapted or use an API client
const constitutional_1 = require("../safety/constitutional");
const research_service_1 = require("../services/research.service");
const policy_service_1 = require("../services/policy.service"); // Import PolicyService
const user_service_1 = require("../services/user.service"); // Import UserService
const logger_1 = require("../utils/logger");
const promises_1 = __importDefault(require("fs/promises"));
const util_1 = require("util"); // For pretty printing objects
const inquirer_1 = __importDefault(require("inquirer")); // For interactive mode
const types_1 = require("../models/types"); // Import enums
// For API client (better for CLI) - This part is conceptual as we don't have a full client lib
// import { ApiClient } from './apiClient'; // const apiClient = new ApiClient(process.env.API_URL, process.env.API_KEY);
const program = new commander_1.Command();
exports.program = program;
program
    .name('opensafe-cli')
    .description('OpenAI Safe CLI tool for AI safety operations and platform management')
    .version('1.1.0'); // Updated version
// Use a global error handler for async commands
const handleAsyncCommand = (action) => {
    return async (...args) => {
        try {
            await action(...args);
        }
        catch (error) {
            logger_1.logger.error('CLI command failed:', error instanceof Error ? error.message : String(error));
            if (process.env.DEBUG_CLI) {
                console.error(error);
            }
            process.exit(1);
        }
    };
};
program
    .command('analyze-text')
    .description('Analyze text for safety violations using local services (or API if refactored)')
    .argument('<text>', 'Text to analyze')
    .option('-c, --context <context>', 'Additional context')
    .option('-p, --policy-id <policyId>', 'ID of the safety policy to apply')
    .option('-o, --output <file>', 'Output file for results (JSON)')
    .action(handleAsyncCommand(async (text, options) => {
    // Note: CLI using services directly might bypass API auth/rate limits.
    // A real CLI for a deployed service would use an API client.
    const analyzer = new analyzer_1.SafetyAnalyzer(); // Assuming direct service usage for now
    const result = await analyzer.analyze(text, options.context); // PolicyID needs integration here if direct
    // If using policyService with analyzer, it's more complex than this direct call.
    // This analyze command should ideally hit the /api/v1/safety/analyze endpoint.
    const output = JSON.stringify(result, null, 2);
    if (options.output) {
        await promises_1.default.writeFile(options.output, output);
        console.log(`Analysis results saved to ${options.output}`);
    }
    else {
        console.log(output);
    }
}));
program
    .command('revise-text')
    .description('Apply constitutional AI to revise text')
    .argument('<text>', 'Text to revise')
    .option('-pr, --principles <file>', 'File containing principles (one per line)')
    .option('-r, --revisions <number>', 'Max revisions', '3')
    .option('-o, --output <file>', 'Output file for results (JSON)')
    .action(handleAsyncCommand(async (text, options) => {
    const constitutional = new constitutional_1.ConstitutionalAI();
    let principles;
    if (options.principles) {
        const principlesText = await promises_1.default.readFile(options.principles, 'utf-8');
        principles = principlesText.split('\n').filter(p => p.trim());
    }
    const result = await constitutional.applyConstitutional(text, principles, parseInt(options.revisions));
    const output = JSON.stringify(result, null, 2);
    if (options.output) {
        await promises_1.default.writeFile(options.output, output);
        console.log(`Revision results saved to ${options.output}`);
    }
    else {
        console.log(output);
    }
}));
// --- Policy Management Commands ---
const policyCommand = program.command('policy').description('Manage safety policies');
policyCommand
    .command('create')
    .description('Create a new safety policy from a JSON file definition.')
    .argument('<file>', 'Path to the JSON file defining the policy.')
    .action(handleAsyncCommand(async (file) => {
    const policyService = new policy_service_1.PolicyService();
    const policyJson = await promises_1.default.readFile(file, 'utf-8');
    const policyData = JSON.parse(policyJson);
    // TODO: Validate policyData against SafetyPolicySchema from Zod
    const newPolicy = await policyService.createPolicy(policyData, 'cli-user'); // Actor ID for CLI
    console.log('Safety policy created successfully:');
    console.log((0, util_1.inspect)(newPolicy, { depth: null, colors: true }));
}));
policyCommand
    .command('list')
    .description('List safety policies.')
    .option('--active', 'List only active policies')
    .option('--inactive', 'List only inactive policies')
    .action(handleAsyncCommand(async (options) => {
    const policyService = new policy_service_1.PolicyService();
    let isActiveFilter = undefined;
    if (options.active)
        isActiveFilter = true;
    if (options.inactive)
        isActiveFilter = false;
    const { policies } = await policyService.listPolicies(1, 10);
    console.log("Policies:");
    policies.forEach(p => console.log(`  ID: ${p.id}, Name: ${p.name}`));
}));
policyCommand
    .command('get <id>')
    .description('Get details of a specific safety policy.')
    .action(handleAsyncCommand(async (id) => {
    const policyService = new policy_service_1.PolicyService();
    const policy = await policyService.getPolicyById(id);
    if (!policy) {
        console.error('Policy not found.');
        return;
    }
    console.log((0, util_1.inspect)(policy, { depth: null, colors: true }));
}));
policyCommand
    .command('update <id>')
    .description('Update a policy from a JSON file (partial update).')
    .argument('<file>', 'Path to JSON file with updates.')
    .action(handleAsyncCommand(async (id, file) => {
    const policyService = new policy_service_1.PolicyService();
    const updateJson = await promises_1.default.readFile(file, 'utf-8');
    const updateData = JSON.parse(updateJson);
    const updatedPolicy = await policyService.updatePolicy(id, updateData, 'cli-user');
    console.log('Policy updated successfully:');
    console.log((0, util_1.inspect)(updatedPolicy, { depth: null, colors: true }));
}));
policyCommand
    .command('delete <id>')
    .description('Delete a safety policy.')
    .action(handleAsyncCommand(async (id) => {
    const policyService = new policy_service_1.PolicyService();
    await policyService.deletePolicy(id, 'cli-user');
    console.log(`Policy ${id} deleted successfully.`);
}));
policyCommand
    .command('suggest-rule')
    .description('Get an AI-suggested policy rule based on a description.')
    .argument('<description>', "Natural language description of the desired safety rule.")
    .option('-c, --context <context>', "Optional context for the suggestion.")
    .option('-vt, --violation-type <type>', "Optional target violation type (e.g., harmful_content).")
    .action(handleAsyncCommand(async (description, options) => {
    // This would ideally call the API: POST /api/v1/policies/suggest-rule
    // Simulating direct call for now or a conceptual client.
    console.log(`Requesting suggestion for: "${description}"`);
    // Mocked response similar to the API endpoint's mock
    let suggestedRule = {
        description: `CLI Suggested rule for: "${description}"`,
        condition: { type: 'keyword_list', parameters: { keywords: ["cli_example", "suggested"] } },
        action: types_1.PolicyAction.FLAG,
        severity: 'medium',
        notes: "This is a CLI-generated suggestion. Review carefully."
    };
    console.log("Suggested Rule:");
    console.log((0, util_1.inspect)(suggestedRule, { depth: null, colors: true }));
    console.log("\nNote: This is a conceptual AI suggestion. Implement actual LLM call for real suggestions via the API.");
}));
// --- User Management Commands ---
const userCommand = program.command('user').description('Manage users');
userCommand
    .command('create')
    .description('Create a new user.')
    .requiredOption('-e, --email <email>', 'User email')
    .requiredOption('-p, --password <password>', 'User password')
    .option('-r, --role <role>', 'User role (user, researcher, admin)', 'user')
    .action(handleAsyncCommand(async (options) => {
    const userService = new user_service_1.UserService();
    const user = await userService.createUser({ email: options.email, password: options.password, role: options.role });
    console.log('User created successfully:');
    console.log((0, util_1.inspect)({ id: user.id, email: user.email, role: user.role }, { colors: true }));
}));
// --- Interactive Mode ---
program
    .command('interactive')
    .alias('i')
    .description('Enter interactive mode for OpenAI Safe CLI.')
    .action(async () => {
    console.log('Welcome to OpenAI Safe Interactive Mode! Type "help" for commands, "exit" to quit.');
    const researchService = new research_service_1.ResearchService(); // Instantiate services as needed or use API client
    const mainLoop = async () => {
        while (true) {
            const { command } = await inquirer_1.default.prompt([{
                    type: 'input',
                    name: 'command',
                    message: 'opensafe>',
                }]);
            if (command.trim().toLowerCase() === 'exit')
                break;
            if (command.trim().toLowerCase() === 'help') {
                console.log("\nAvailable interactive commands:");
                console.log("  analyze <text> [--context <c>]         - Analyze text for safety");
                console.log("  experiment list [--status <status>]  - List research experiments");
                console.log("  policy list                          - List safety policies");
                console.log("  exit                                 - Exit interactive mode\n");
                continue;
            }
            try {
                const parts = command.trim().split(/\s+/);
                const cmd = parts[0];
                // Extremely basic command parsing - a real interactive CLI needs more robust parsing
                if (cmd === 'analyze' && parts[1]) {
                    // This analyze needs to be refactored to use the API client for consistency.
                    // For now, it shows the concept.
                    const textToAnalyze = parts.slice(1).join(" "); // Simplistic argument parsing
                    const analyzer = new analyzer_1.SafetyAnalyzer();
                    const result = await analyzer.analyze(textToAnalyze);
                    console.log((0, util_1.inspect)(result, { depth: null, colors: true }));
                }
                else if (cmd === 'experiment' && parts[1] === 'list') {
                    // const experiments = await researchService.listExperiments({}, 'cli-user', UserRole.ADMIN); // Example
                    console.log("Listing experiments (conceptual - use dedicated commands for full functionality)");
                    // console.log(inspect(experiments, {depth: 1, colors: true}));
                }
                else if (cmd === 'policy' && parts[1] === 'list') {
                    const policyService = new policy_service_1.PolicyService();
                    const { policies } = await policyService.listPolicies(1, 10);
                    console.log("Policies:");
                    policies.forEach(p => console.log(`  ID: ${p.id}, Name: ${p.name}`));
                }
                else {
                    console.log('Unknown command or insufficient arguments. Type "help".');
                }
            }
            catch (error) {
                logger_1.logger.error('Interactive command error:', error instanceof Error ? error.message : String(error));
            }
        }
    };
    await mainLoop();
    console.log('Exiting interactive mode.');
});
if (require.main === module) {
    // Initialize database or other async setup if services are used directly and need it.
    // For a CLI that primarily uses an API, this might not be needed here.
    // (async () => {
    //   await initializeDatabase(); // Example if direct DB access by services in CLI
    //   program.parse(process.argv);
    // })();
    program.parse(process.argv);
}
//# sourceMappingURL=index.js.map