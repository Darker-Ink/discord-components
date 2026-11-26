import type { D1Migration } from 'cloudflare:test';
import type * as worker from '../src/worker/index';

declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[];
    }
    interface GlobalProps {
      mainModule: typeof worker;
    }
  }
}
