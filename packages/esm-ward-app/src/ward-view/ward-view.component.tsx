import { InlineNotification } from '@carbon/react';
import { WorkspaceOverlay, useFeatureFlag, useLocations, useSession, type Location } from '@openmrs/esm-framework';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import EmptyBedSkeleton from '../beds/empty-bed-skeleton';
import { useAdmissionLocation } from '../hooks/useAdmissionLocation';
import WardBed from './ward-bed.component';
import { bedLayoutToBed, filterBeds } from './ward-view.resource';
import styles from './ward-view.scss';
import WardViewHeader from '../ward-view-header/ward-view-header.component';

const WardView = () => {
  const { locationUuid: locationUuidFromUrl } = useParams();
  const { sessionLocation } = useSession();
  const allLocations = useLocations();
  const { t } = useTranslation();
  const isBedManagementModuleInstalled = useFeatureFlag('bedmanagement-module');
  const locationFromUrl = allLocations.find((l) => l.uuid === locationUuidFromUrl);
  const invalidLocation = Boolean(locationUuidFromUrl && !locationFromUrl);
  const location = (locationFromUrl ?? sessionLocation) as any as Location;
  //TODO:Display patients with admitted status (based on their observations) that have no beds assigned
  if (!isBedManagementModuleInstalled) return <></>;

  return invalidLocation ? (
    <InlineNotification
      kind="error"
      lowContrast={true}
      title={t('invalidLocationSpecified', 'Invalid location specified')}
      subtitle={t('unknownLocationUuid', 'Unknown location uuid: {{locationUuidFromUrl}}', {
        locationUuidFromUrl,
      })}
    />
  ) : (
    <div className={styles.wardView}>
      <WardViewHeader location={location.display} />
      <div className={styles.wardViewMain}>
        <WardViewByLocation location={location} />
      </div>
      <WorkspaceOverlay contextKey="ward" />
    </div>
  );
};

const WardViewByLocation = ({ location }: { location: Location }) => {
  const { admissionLocation, isLoading, error } = useAdmissionLocation(location.uuid);
  const { t } = useTranslation();

  if (admissionLocation) {
    const bedLayouts = filterBeds(admissionLocation);

    return (
      <>
        {bedLayouts.map((bedLayout, i) => {
          const { patient } = bedLayout;
          const bed = bedLayoutToBed(bedLayout);
          return <WardBed key={bed.uuid} bed={bed} patients={patient ? [patient] : null} />;
        })}
        {bedLayouts.length == 0 && (
          <InlineNotification
            kind="warning"
            lowContrast={true}
            title={t('noBedsConfigured', 'No beds configured for this location')}
          />
        )}
      </>
    );
  } else if (isLoading) {
    return (
      <>
        {Array(20)
          .fill(0)
          .map((_, i) => (
            <EmptyBedSkeleton key={i} />
          ))}
      </>
    );
  } else {
    return (
      <InlineNotification
        kind="error"
        lowContrast={true}
        title={t('errorLoadingWardLocation', 'Error loading ward location')}
        subtitle={
          error?.message ??
          t('invalidWardLocation', 'Invalid ward location: {{location}}', { location: location.display })
        }
      />
    );
  }
};

export default WardView;
