import { InlineNotification } from '@carbon/react';
import { WorkspaceContainer } from '@openmrs/esm-framework';
import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import EmptyBedSkeleton from '../beds/empty-bed-skeleton';
import UnassignedPatient from '../beds/unassigned-patient.component';
import { useAdmissionLocation } from '../hooks/useAdmissionLocation';
import { useInpatientAdmission } from '../hooks/useInpatientAdmission';
import useWardLocation from '../hooks/useWardLocation';
import { type InpatientAdmission, type WardPatient } from '../types';
import WardViewHeader from '../ward-view-header/ward-view-header.component';
import WardBed from './ward-bed.component';
import { bedLayoutToBed, filterBeds } from './ward-view.resource';
import styles from './ward-view.scss';

const WardView = () => {
  const response = useWardLocation();
  const { isLoadingLocation, invalidLocation } = response;
  const { t } = useTranslation();

  if (isLoadingLocation) {
    return <></>;
  }

  if (invalidLocation) {
    return <InlineNotification kind="error" title={t('invalidLocationSpecified', 'Invalid location specified')} />;
  }

  return (
    <div className={styles.wardView}>
      <WardViewHeader />
        <WardViewMain />
      <WorkspaceContainer overlay contextKey="ward" />
    </div>
  );
};

const WardViewMain = () => {
  const { location } = useWardLocation();

  const {
    admissionLocation,
    isLoading: isLoadingAdmissionLocation,
    error: errorLoadingAdmissionLocation,
  } = useAdmissionLocation();
  const {
    data: inpatientAdmissions,
    isLoading: isLoadingInpatientAdmissions,
    error: errorLoadingInpatientAdmissions,
    hasMore: hasMoreInpatientAdmissions,
    loadMore: loadMoreInpatientAdmissions,
  } = useInpatientAdmission();
  const { t } = useTranslation();
  const inpatientAdmissionsByPatientUuid = useMemo(() => {
    const map = new Map<string, InpatientAdmission>();
    for (const inpatientAdmission of inpatientAdmissions ?? []) {
      map.set(inpatientAdmission.patient.uuid, inpatientAdmission);
    }
    return map;
  }, [inpatientAdmissions]);

  const scrollToLoadMoreTrigger = useRef<HTMLDivElement>(null);
  useEffect(function scrollToLoadMore() {
      const observer = new IntersectionObserver(
        entries => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              if(hasMoreInpatientAdmissions && !errorLoadingInpatientAdmissions && !isLoadingInpatientAdmissions) {
                loadMoreInpatientAdmissions();
              }
            }
          }
        )},
        { threshold: 1 }
      );
    
      if (scrollToLoadMoreTrigger.current) {
        observer.observe(scrollToLoadMoreTrigger.current);
      }
      return () => {
        if (scrollToLoadMoreTrigger.current) {
          observer.unobserve(scrollToLoadMoreTrigger.current);
        }
      };
  }, [scrollToLoadMoreTrigger, hasMoreInpatientAdmissions, errorLoadingInpatientAdmissions, loadMoreInpatientAdmissions]);

  const bedLayouts = admissionLocation && filterBeds(admissionLocation);
  // iterate over all beds
  const wardBeds = bedLayouts?.map((bedLayout) => {
    const { patients } = bedLayout;
    const bed = bedLayoutToBed(bedLayout);
    const wardPatients: WardPatient[] = patients.map((patient): WardPatient => {
      const inpatientAdmission = inpatientAdmissionsByPatientUuid.get(patient.uuid);
      if (inpatientAdmission) {
        const { patient, visit, currentInpatientRequest } = inpatientAdmission;
        return { patient, visit, bed, inpatientAdmission, inpatientRequest: currentInpatientRequest || null };
      } else {
        // for some reason this patient is in a bed but not in the list of admitted patients, so we need to use the patient data from the bed endpoint
        return {
          patient: patient,
          visit: null,
          bed,
          inpatientAdmission: null, // populate after BED-13
          inpatientRequest: null,
        };
      }
    });
    return <WardBed key={bed.uuid} bed={bed} wardPatients={wardPatients} />;
  });

  const patientsInBedsUuids = bedLayouts?.flatMap((bedLayout) => bedLayout.patients.map((patient) => patient.uuid));
  const wardUnassignedPatients =
    inpatientAdmissions &&
    inpatientAdmissions
      .filter(
        (inpatientAdmission) => !patientsInBedsUuids || !patientsInBedsUuids.includes(inpatientAdmission.patient.uuid),
      )
      .map((inpatientAdmission) => {
        return (
          <UnassignedPatient
            wardPatient={{
              patient: inpatientAdmission.patient,
              visit: inpatientAdmission.visit,
              bed: null,
              inpatientAdmission,
              inpatientRequest: null,
            }}
            key={inpatientAdmission.patient.uuid}
          />
        );
      });

  return (
    <div className={styles.wardViewMain} ref={scrollToLoadMoreTrigger}>
      {wardBeds}
      {bedLayouts?.length == 0 && (
        <InlineNotification
          kind="warning"
          lowContrast={true}
          title={t('noBedsConfigured', 'No beds configured for this location')}
        />
      )}
      {wardUnassignedPatients}
      {(isLoadingAdmissionLocation || isLoadingInpatientAdmissions) && <EmptyBeds />}
      {errorLoadingAdmissionLocation && (
        <InlineNotification
          kind="error"
          lowContrast={true}
          title={t('errorLoadingWardLocation', 'Error loading ward location')}
          subtitle={
            errorLoadingAdmissionLocation?.message ??
            t('invalidWardLocation', 'Invalid ward location: {{location}}', { location: location.display })
          }
        />
      )}
      {errorLoadingInpatientAdmissions && (
        <InlineNotification
          kind="error"
          lowContrast={true}
          title={t('errorLoadingPatients', 'Error loading admitted patients')}
          subtitle={errorLoadingInpatientAdmissions?.message}
        />
      )}
      <div ref={scrollToLoadMoreTrigger}></div>
    </div>
  );
};

const EmptyBeds = () => {
  return (
    <>
      {Array(20)
        .fill(0)
        .map((_, i) => (
          <EmptyBedSkeleton key={i} />
        ))}
    </>
  );
};

export default WardView;
