import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Formik, Form, useFormikContext } from 'formik';
import { Resources, ResourcesContext } from '../../../../offline.resources';
import { PatientRegistrationContext } from '../../../patient-registration-context';
import { useConfig } from '@openmrs/esm-framework';
import { useAddressHierarchy, useOrderedAddressHierarchyLevels } from '../address-hierarchy.resource';
import { mockedAddressTemplate, mockedAddressOptions, mockedOrderedFields } from './mocks';
import AddressSearchComponent from '../address-search.component';
import userEvent from '@testing-library/user-event';

useAddressHierarchy;
jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  useConfig: jest.fn(),
}));

jest.mock('../address-hierarchy.resource', () => ({
  ...(jest.requireActual('../address-hierarchy.resource') as jest.Mock),
  useOrderedAddressHierarchyLevels: jest.fn(),
  useAddressHierarchy: jest.fn(),
}));

jest.mock('../../../patient-registration.resource', () => ({
  ...(jest.requireActual('../../../../patient-registration.resource') as jest.Mock),
  useAddressHierarchy: jest.fn(),
}));

jest.mock('formik', () => ({
  ...(jest.requireActual('formik') as jest.Mock),
  useFormikContext: jest.fn(() => ({})),
}));

const allFields = mockedAddressTemplate.lines
  .flat()
  .filter((field) => field.isToken === 'IS_ADDR_TOKEN')
  .map(({ codeName, displayText }) => ({
    id: codeName,
    name: codeName,
    label: displayText,
  }));
const orderMap = Object.fromEntries(mockedOrderedFields.map((field, indx) => [field, indx]));
allFields.sort((existingField1, existingField2) => orderMap[existingField1.name] - orderMap[existingField2.name]);

async function renderAddressHierarchy(addressTemplate = mockedAddressTemplate) {
  await render(
    <ResourcesContext.Provider value={{ addressTemplate } as Resources}>
      <Formik initialValues={{}} onSubmit={null}>
        <Form>
          <PatientRegistrationContext.Provider value={{ setFieldValue: jest.fn() } as any}>
            <AddressSearchComponent addressLayout={allFields} />
          </PatientRegistrationContext.Provider>
        </Form>
      </Formik>
    </ResourcesContext.Provider>,
  );
}

const setFieldValue = jest.fn();

describe('Testing address search bar', () => {
  beforeEach(() => {
    cleanup();
    (useConfig as jest.Mock).mockImplementation(() => ({
      fieldConfigurations: {
        address: {
          useAddressHierarchy: {
            enabled: true,
            useQuickSearch: true,
            searchAddressByLevel: false,
          },
        },
      },
    }));
    (useOrderedAddressHierarchyLevels as jest.Mock).mockImplementation(() => ({
      orderedFields: mockedOrderedFields,
      isLoadingFieldOrder: false,
      errorFetchingFieldOrder: null,
    }));
    (useFormikContext as jest.Mock).mockImplementation(() => ({
      setFieldValue,
    }));
  });

  it('should render the search bar', () => {
    (useAddressHierarchy as jest.Mock).mockImplementation(() => ({
      addresses: [],
      error: null,
      isLoading: false,
    }));
    renderAddressHierarchy();
    const searchbox = screen.getByRole('searchbox');
    expect(searchbox).toBeInTheDocument();
    const ul = screen.queryByRole('list');
    expect(ul).not.toBeInTheDocument();
  });

  // see: https://openmrs.atlassian.net/browse/O3-2632
  it.skip("should render only the results for the search term matched address' parents", async () => {
    (useAddressHierarchy as jest.Mock).mockImplementation(() => ({
      addresses: mockedAddressOptions,
      error: null,
      isLoading: false,
    }));
    renderAddressHierarchy();
    const searchString = 'nea';
    const separator = ' > ';
    const options: Set<string> = new Set();
    mockedAddressOptions.forEach((address) => {
      const values = address.split(separator);
      values.forEach((val, index) => {
        if (val.toLowerCase().includes(searchString.toLowerCase())) {
          options.add(values.slice(0, index + 1).join(separator));
        }
      });
    });

    const addressOptions = [...options];
    for (const address of addressOptions) {
      const optionElement = screen.getByText(address);
      expect(optionElement).toBeInTheDocument();
      fireEvent.click(optionElement);
      const values = address.split(separator);
      await Promise.all(
        allFields.map(async ({ name }, index) => {
          await waitFor(() => expect(setFieldValue).toBeCalledWith(`address.${name}`, values?.[index]));
        }),
      );
    }
  });
});
