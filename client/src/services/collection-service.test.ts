import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportCollection } from './collection-service';
import { api } from './api';

// Mock the api module
vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('exportCollection', () => {
  let mockCreateElement: any;
  let mockAppendChild: any;
  let mockRemoveChild: any;
  let mockCreateObjectURL: any;
  let mockRevokeObjectURL: any;
  let mockClick: any;

  beforeEach(() => {
    // Mock DOM APIs
    mockClick = vi.fn();
    mockAppendChild = vi.fn();
    mockRemoveChild = vi.fn();

    mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue({
      click: mockClick,
      href: '',
      download: '',
    } as any);

    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

    mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    mockRevokeObjectURL = vi.fn();

    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call API with correct params', async () => {
    const mockCsvData = 'name,set_code,quantity\nLightning Bolt,M21,4';
    vi.mocked(api.get).mockResolvedValue({
      data: mockCsvData,
      headers: {
        'content-disposition': 'attachment; filename="mtg-collection-2026-02-03.csv"',
      },
    });

    await exportCollection({
      search: 'Lightning',
      colors: 'R',
      forTrade: true,
    });

    expect(api.get).toHaveBeenCalledWith('/collection/export', {
      params: {
        search: 'Lightning',
        colors: 'R',
        forTrade: true,
      },
      responseType: 'blob',
    });
  });

  it('should create download link and trigger download', async () => {
    const mockCsvData = 'name,set_code,quantity\nLightning Bolt,M21,4';
    vi.mocked(api.get).mockResolvedValue({
      data: mockCsvData,
      headers: {
        'content-disposition': 'attachment; filename="mtg-collection-2026-02-03.csv"',
      },
    });

    await exportCollection();

    expect(mockCreateElement).toHaveBeenCalledWith('a');
    expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should extract filename from Content-Disposition header', async () => {
    const mockCsvData = 'name,set_code,quantity\nLightning Bolt,M21,4';
    vi.mocked(api.get).mockResolvedValue({
      data: mockCsvData,
      headers: {
        'content-disposition': 'attachment; filename="mtg-collection-2026-02-03.csv"',
      },
    });

    const mockLink = {
      click: mockClick,
      href: '',
      download: '',
    };
    mockCreateElement.mockReturnValue(mockLink);

    await exportCollection();

    expect(mockLink.download).toBe('mtg-collection-2026-02-03.csv');
  });

  it('should use default filename when Content-Disposition header is missing', async () => {
    const mockCsvData = 'name,set_code,quantity\nLightning Bolt,M21,4';
    vi.mocked(api.get).mockResolvedValue({
      data: mockCsvData,
      headers: {},
    });

    const mockLink = {
      click: mockClick,
      href: '',
      download: '',
    };
    mockCreateElement.mockReturnValue(mockLink);

    await exportCollection();

    // Should use default filename with current date
    expect(mockLink.download).toMatch(/mtg-collection-\d{4}-\d{2}-\d{2}\.csv/);
  });

  it('should create Blob with correct MIME type', async () => {
    const mockCsvData = 'name,set_code,quantity\nLightning Bolt,M21,4';
    vi.mocked(api.get).mockResolvedValue({
      data: mockCsvData,
      headers: {
        'content-disposition': 'attachment; filename="test.csv"',
      },
    });

    let capturedBlob: Blob | null = null;
    mockCreateObjectURL.mockImplementation((blob: unknown) => {
      capturedBlob = blob as Blob;
      return 'blob:mock-url';
    });

    await exportCollection();

    expect(capturedBlob).toBeInstanceOf(Blob);
    expect((capturedBlob as Blob).type).toBe('text/csv');
  });

  it('should pass undefined for optional params that are not provided', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: 'csv data',
      headers: {},
    });

    await exportCollection({
      search: 'test',
      // Other params omitted
    });

    expect(api.get).toHaveBeenCalledWith('/collection/export', {
      params: {
        search: 'test',
        setCode: undefined,
        colors: undefined,
        rarity: undefined,
        priceMin: undefined,
        priceMax: undefined,
        forTrade: undefined,
      },
      responseType: 'blob',
    });
  });

  it('should pass empty strings to API (server handles empty params)', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: 'csv data',
      headers: {},
    });

    await exportCollection({
      colors: '',
    });

    expect(api.get).toHaveBeenCalledWith('/collection/export', {
      params: {
        colors: '',
      },
      responseType: 'blob',
    });
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

    await expect(exportCollection()).rejects.toThrow('Network error');

    // Should not create download link on error
    expect(mockCreateElement).not.toHaveBeenCalled();
  });
});
