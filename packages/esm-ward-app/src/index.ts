import {
  defineConfigSchema,
  defineExtensionConfigSchema,
  getAsyncLifecycle,
  getSyncLifecycle,
  registerBreadcrumbs,
} from '@openmrs/esm-framework';
import rootComponent from './root.component';
import { configSchema } from './config-schema';
import {
  admittedPatientHeaderAddressConfigSchema,
  admittedPatientHeaderNameConfigSchema,
} from './ward-patient-card/bento-elements/admitted-patient-header-config-schema';

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

const moduleName = '@openmrs/esm-ward-app';

const options = {
  featureName: 'ward',
  moduleName,
};

export const root = getSyncLifecycle(rootComponent, options);

export function startupApp() {
  registerBreadcrumbs([]);

  defineConfigSchema(moduleName, configSchema);
  defineExtensionConfigSchema('admitted-patient-header-address', admittedPatientHeaderAddressConfigSchema);
  defineExtensionConfigSchema('admitted-patient-header-name', admittedPatientHeaderNameConfigSchema);
}

// extensions:

// workspaces:
export const pendingAdmissionRequestsWorkspace = getAsyncLifecycle(
  () => import('./admission-requests/pending-admission-requests.workspace'),
  {
    featureName: 'pending-admission-requests-workspace', 
    moduleName,
  }
)
