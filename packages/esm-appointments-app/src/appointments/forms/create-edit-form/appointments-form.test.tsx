import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { useConfig, usePatient } from '@openmrs/esm-framework';
import { mockPatient, mockServices, mockProviders } from '../../../../../../__mocks__/appointments.mock';
import { mockLocations } from '../../../../../../__mocks__/locations.mock';
import { mockSession } from '../../../../../../__mocks__/session.mock';
import { MappedAppointment } from '../../../types';
import AppointmentForm from './appointments-form.component';

const mockedUseConfig = useConfig as jest.Mock;
const mockedUsePatient = usePatient as jest.Mock;

function renderAppointmentsForm(context: string, patientUuid?: string, appointment?: MappedAppointment) {
  render(<AppointmentForm patientUuid={patientUuid} context={context} appointment={appointment} />);
}

jest.mock('../forms.resource.ts', () => {
  const originalModule = jest.requireActual('../forms.resource.ts');

  return {
    ...originalModule,
    useServices: jest.fn().mockReturnValue({ services: mockServices }),
  };
});

jest.mock('@openmrs/esm-framework', () => {
  const originalModule = jest.requireActual('@openmrs/esm-framework');
  return {
    ...originalModule,
    openmrsFetch: jest.fn(),
    useLocations: jest.fn().mockImplementation(() => mockLocations.data),
    useSession: jest.fn().mockImplementation(() => mockSession.data),
    useProviders: jest.fn().mockImplementation(() => mockProviders.data),
  };
});

const mockedConfig = {
  daysOfTheWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  appointmentTypes: ['Scheduled', 'WalkIn', 'Virtual'],
  appointmentStatuses: ['Requested', 'Scheduled', 'CheckedIn', 'Completed', 'Cancelled', 'Missed'],
  hiddenFormFields: [],
};

describe('AppointmentForm', () => {
  const patient = mockPatient;
  beforeEach(() => {
    mockedUseConfig.mockReturnValue(mockedConfig);
    mockedUsePatient.mockReturnValue({
      patient,
      isLoading: false,
      error: null,
      patientUuid: patient.uuid,
    });
  });

  it('renders details of the correct patient in the patient banner', () => {
    renderAppointmentsForm('creating', mockPatient.uuid);

    expect(screen.getByText(/Date and time/i)).toBeInTheDocument();
  });

  it('renders the form with all expected inputs in create mode', () => {
    renderAppointmentsForm('creating', mockPatient.uuid);

    expect(screen.getByRole('combobox', { name: /select a location/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /select a service/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /select an appointment type/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /select a provider/i })).toBeInTheDocument();
  });

  it('renders the expected appointment types', () => {
    renderAppointmentsForm('creating', mockPatient.uuid);
    const appointmentTypeSelect = screen.getByLabelText('Select an appointment type');

    expect(within(appointmentTypeSelect).getAllByRole('option')).toHaveLength(3);
    expect(within(appointmentTypeSelect).getAllByRole('option')[2]).toHaveValue('Virtual');
    expect(within(appointmentTypeSelect).getAllByRole('option')[1]).toHaveValue('WalkIn');
    expect(within(appointmentTypeSelect).getAllByRole('option')[0]).toHaveValue('Scheduled');
  });
});
