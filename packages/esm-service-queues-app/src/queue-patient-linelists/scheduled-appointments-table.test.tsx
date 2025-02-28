import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import AppointmentsTable from './scheduled-appointments-table.component';
import { mockAppointmentsData } from '../../__mocks__/appointments-data.mock';

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  useConfig: () => ({
    appointmentStatuses: ['All', 'Scheduled', 'Completed'],
  }),
  usePagination: () => ({
    goTo: jest.fn(),
    results: mockAppointmentsData.data,
    currentPage: 1,
  }),
}));

jest.mock('./queue-linelist.resource', () => ({
  useAppointments: () => ({
    appointmentQueueEntries: mockAppointmentsData.data,
    isLoading: false,
  }),
}));

describe('AppointmentsTable', () => {
  it('renders appointments when loading is complete', () => {
    render(<AppointmentsTable />);

    const appointmentName = screen.getByText('Hungai Kevin');
    expect(appointmentName).toBeInTheDocument();
  });

  it('filters appointments based on status selection', async () => {
    const user = userEvent.setup();

    render(<AppointmentsTable />);

    const statusDropdown = screen.getAllByLabelText('Status:');

    await user.type(statusDropdown[0], 'Completed');

    const filteredAppointmentName = screen.getByText('Hungai Kevin');
    expect(filteredAppointmentName).toBeInTheDocument();
  });
});
