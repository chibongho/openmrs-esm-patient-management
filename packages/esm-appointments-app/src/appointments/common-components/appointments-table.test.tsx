import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { MappedAppointment } from '../../types';
import { usePagination } from '@openmrs/esm-framework';
import { downloadAppointmentsAsExcel } from '../../helpers/excel';
import { launchOverlay } from '../../hooks/useOverlay';
import AppointmentsTable from './appointments-table.component';
import PatientSearch from '../../patient-search/patient-search.component';

// Define mock appointments data for testing purposes
const appointments: Array<MappedAppointment> = [
  {
    patientUuid: '1234',
    name: 'John Smith',
    identifier: '12345',
    dateTime: '2023-04-13T12:00:00.000Z',
    serviceType: 'Service',
    provider: 'Dr. Jane Doe',
    id: '1234',
    age: '50',
    gender: 'F',
    providers: [],
    appointmentKind: 'Scheduled',
    appointmentNumber: '1234',
    location: 'location',
    phoneNumber: '1234567890',
    status: 'status',
    comments: 'some comments',
    dob: '2020-04-13T12:00:00.000Z',
    serviceUuid: '1234',
  },
];

const mockUsePagination = usePagination as jest.Mock;
const mockGoToPage = jest.fn();
const mockDownloadAppointmentsAsExcel = downloadAppointmentsAsExcel as jest.Mock;
const mockLaunchOverlay = launchOverlay as jest.Mock;

jest.mock('../../helpers/excel');
jest.mock('../../hooks/useOverlay');

jest.mock('@openmrs/esm-framework', () => {
  const originalModule = jest.requireActual('@openmrs/esm-framework');
  return {
    ...originalModule,
    openmrsFetch: jest.fn(),
    useConfig: jest.fn(() => ({
      customPatientChartUrl: 'someUrl',
    })),
  };
});

describe('AppointmentsBaseTable', () => {
  const props = {
    appointments: [],
    isLoading: false,
    tableHeading: 'Scheduled',
    visits: [],
    scheduleType: 'Scheduled',
  };

  it('should render empty state if appointments are not provided', async () => {
    const user = userEvent.setup();

    render(<AppointmentsTable {...props} />);

    await screen.findByRole('heading', { name: /scheduled appointment/i });

    const emptyScreenText = screen.getByText(/There are no scheduled appointments to display/);
    expect(emptyScreenText).toBeInTheDocument();

    const launchAppointmentsForm = screen.getByRole('button', { name: /Create appointment/ });

    await user.click(launchAppointmentsForm);

    expect(mockLaunchOverlay).toHaveBeenCalledWith('Search', <PatientSearch />);
  });

  it('should render loading state when loading data', () => {
    render(<AppointmentsTable {...props} isLoading={true} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render table with headers and rows if appointments are provided', async () => {
    mockUsePagination.mockReturnValue({
      results: appointments.slice(0, 2),
      goTo: mockGoToPage,
      currentPage: 1,
    });

    render(<AppointmentsTable {...props} appointments={appointments} />);

    await screen.findByRole('heading', { name: /scheduled appointment/i });

    expect(screen.getByText('Patient name')).toBeInTheDocument();
    expect(screen.getByText('Identifier')).toBeInTheDocument();
    expect(screen.getByText('Service Type')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    const patient = screen.getByText('John Smith');
    expect(patient).toBeInTheDocument();
    expect(patient).toHaveAttribute('href', 'someUrl');
    expect(screen.getByText('12345')).toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
  });

  it('should update search string when search input is changed', async () => {
    const user = userEvent.setup();

    render(<AppointmentsTable {...props} appointments={appointments} />);

    await screen.findByRole('heading', { name: /scheduled appointment/i });

    const searchInput = screen.getByRole('searchbox');

    await user.type(searchInput, 'John');
    expect(searchInput).toHaveValue('John');
  });

  it("should contain the title 'Scheduled appointments' and Total count", async () => {
    render(<AppointmentsTable {...props} appointments={appointments} />);

    await screen.findByRole('heading', { name: /scheduled appointment/i });

    expect(screen.getByText(/Scheduled appointment/)).toBeInTheDocument();
    expect(screen.getByText(/Total 1/)).toBeInTheDocument();
  });

  it('should execute the download function when download button is clicked', async () => {
    const user = userEvent.setup();

    render(<AppointmentsTable {...props} appointments={appointments} />);

    await screen.findByRole('heading', { name: /scheduled appointment/i });

    const downloadButton = screen.getByRole('button', { name: /Download/ });

    await user.click(downloadButton);

    expect(downloadButton).toBeInTheDocument();
    expect(mockDownloadAppointmentsAsExcel).toHaveBeenCalledWith(appointments, expect.anything());
  });

  it('should have pagination when there are more than 25 appointments', async () => {
    const user = userEvent.setup();

    const mockAppointments = Array.from({ length: 100 }, (_, i) => ({
      patientUuid: `${i}`,
      name: `Patient ${i}`,
      identifier: `${i}${i}${i}${i}${i}`,
      dateTime: new Date().toISOString(),
      serviceType: 'Service',
      provider: `Dr. Provider ${i}`,
      id: `${i}`,
      age: `${i + 20}`,
      gender: i % 2 === 0 ? 'M' : 'F',
      providers: [],
      appointmentKind: 'Scheduled',
      appointmentNumber: `${i}${i}${i}${i}${i}`,
      location: 'Location',
      phoneNumber: '1234567890',
      status: 'Status',
      comments: 'Some comments',
      dob: new Date(`${i + 1950}-01-01T00:00:00.000Z`).toISOString(),
      serviceUuid: `${i}${i}${i}${i}${i}`,
    }));
    mockUsePagination.mockReturnValue({
      results: appointments.slice(0, 2),
      goTo: mockGoToPage,
      currentPage: 1,
    });

    render(<AppointmentsTable {...props} appointments={mockAppointments} />);

    await screen.findByRole('heading', { name: /scheduled appointment/i });

    expect(screen.getByText(/1–25 of 100 items/)).toBeInTheDocument();
    const nextPageButton = screen.getByRole('button', { name: /Next page/ });
    const previousPageButton = screen.getByRole('button', { name: /Previous page/ });

    // Clicking the next page button should call the goTo function with the next page number
    await user.click(nextPageButton);

    expect(mockGoToPage).toHaveBeenCalledWith(2);
    expect(screen.getByText(/26–50 of 100 items/)).toBeInTheDocument();

    // Clicking the previous page button should call the goTo function with the previous page number
    await user.click(previousPageButton);

    expect(mockGoToPage).toHaveBeenCalledWith(1);

    expect(screen.getByText(/1–25 of 100 items/)).toBeInTheDocument();
  });
});
