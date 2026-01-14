import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        /**
         * This is needed for when contract tests need to build Docker images
         * In particular, then Weather Reporter is slow, probably because it
         * needs to download the Zig compiler, *then* build the project
         * (Once cached, this is not a problem however)
         */
        hookTimeout: 180000
    }
})
