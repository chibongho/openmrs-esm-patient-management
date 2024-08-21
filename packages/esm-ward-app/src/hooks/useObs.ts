import { restBaseUrl, useServerInfinite } from '@openmrs/esm-framework';
import { useEffect } from 'react';
import { type Observation } from '../types';

interface ObsSearchCriteria {
  patient: string;
  concept: string;
}

export function useObs(criteria?: ObsSearchCriteria, representation = 'default') {
  const params = new URLSearchParams({
    ...criteria,
    v: representation,
  });

  const apiUrl = `${restBaseUrl}/obs?${params}`;
  const response = useServerInfinite<Observation>(apiUrl);
  const { hasMore, loadMore } = response;
  useEffect(() => {
    hasMore && loadMore();
  }, [hasMore]);

  return response;
}
