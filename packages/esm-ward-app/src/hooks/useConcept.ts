import { type Concept, restBaseUrl, useServerInfinite } from '@openmrs/esm-framework';
import { useEffect } from 'react';

export function useConcepts(uuids: string[], rep = 'default') {
  const apiUrl = `${restBaseUrl}/concept?references=${uuids.join()}&v=${rep}`;

  const response = useServerInfinite<Concept>(apiUrl);
  const { data, hasMore, loadMore, ...rest } = response;
  useEffect(() => {
    hasMore && loadMore();
  }, [hasMore, loadMore]);
  return {
    concepts: data,
    ...rest,
  };
}
