import type { ModelProviderType } from '@/types/model';

declare module '@/types/model' {
  interface ModelFilterParams {
    provider?: ModelProviderType | string | null;
  }

  interface ModelFormData {
    provider?: ModelProviderType | string | null;
  }

  interface ModelCreateParams {
    provider?: ModelProviderType | string | null;
  }
}
