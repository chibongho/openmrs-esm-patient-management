import { type FetchResponse, openmrsFetch, restBaseUrl, useServerInfinite } from '@openmrs/esm-framework';
import type { DispositionType, InpatientRequest, InpatientRequestFetchResponse } from '../types';
import useSWR from 'swr';
import useWardLocation from './useWardLocation';
import { useEffect, useMemo } from 'react';

// prettier-ignore
const defaultRep =
  'custom:(' +
    'dispositionLocation,' +
    'dispositionType,' +
    'disposition,' +
    'dispositionEncounter:full,' +
    'patient:(uuid,identifiers,voided,' +
      'person:(uuid,display,gender,age,birthdate,birthtime,preferredName,preferredAddress,dead,deathDate)),' + 
    'dispositionObsGroup,' +
    'visit)';

export function useInpatientRequest(
  dispositionType: Array<DispositionType> = ['ADMIT', 'TRANSFER'],
  rep: string = defaultRep,
) {
  const { location } = useWardLocation();
  const searchParams = new URLSearchParams();
  searchParams.set('dispositionType', dispositionType.join(','));
  searchParams.set('dispositionLocation', location?.uuid);
  searchParams.set('v', rep);

  const { data, ...rest } = useServerInfinite<InpatientRequest>(
    location?.uuid ? `${restBaseUrl}/emrapi/inpatient/request?${searchParams.toString()}` : null,
    openmrsFetch,
  );
  const { hasMore, loadMore } = rest;
  useEffect(() => {
    hasMore && loadMore();
  }, [hasMore]);

  return { inpatientRequests: data, ...rest };
}
