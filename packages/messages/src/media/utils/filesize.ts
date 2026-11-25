// humanize.js's numberFormat/filesize, which the client uses for attachment sizes ("1.50 MB", "512 bytes").
const numberFormat = (value: number, decimals = 2, decimalPoint = '.', thousandsSeparator = ',') => {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(+value || 0);
  const integer = `${parseInt(abs.toFixed(decimals), 10)}`;
  const head = integer.length > 3 ? integer.length % 3 : 0;
  return (
    sign +
    (head ? integer.substr(0, head) + thousandsSeparator : '') +
    integer.substr(head).replace(/(\d{3})(?=\d)/g, `$1${thousandsSeparator}`) +
    (decimals
      ? decimalPoint +
        Math.abs(abs - Number(integer))
          .toFixed(decimals)
          .slice(2)
      : '')
  );
};

const UNITS = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

export const formatFileSize = (bytes: number) => {
  if (bytes <= 0) return '0 bytes';
  const decimals = bytes < 1024 ? 0 : 2;
  let unit = UNITS.length - 1;
  for (let i = 0; i < UNITS.length; i++) {
    if (bytes < Math.pow(1024, i + 1)) {
      unit = i;
      break;
    }
  }
  return `${numberFormat(bytes / Math.pow(1024, unit), decimals)} ${UNITS[unit]}`;
};

const FILE_TYPES: { reType?: RegExp; reName?: RegExp; klass: string }[] = [
  { reType: /^image\/vnd.adobe.photoshop/, klass: 'photoshop' },
  { reType: /^image\/svg\+xml/, klass: 'webcode' },
  { reType: /^image\//, klass: 'image' },
  { reType: /^video\//, klass: 'video' },
  { reName: /\.pdf$/, klass: 'acrobat' },
  { reName: /\.ae/, klass: 'ae' },
  { reName: /\.sketch$/, klass: 'sketch' },
  { reName: /\.ai$/, klass: 'ai' },
  { reName: /\.(?:rar|zip|7z|tar|tar\.gz)$/, klass: 'archive' },
  {
    reName:
      /\.(?:c\+\+|cpp|cc|c|h|hpp|mm|m|json|js|ts|rb|rake|py|asm|fs|pyc|dtd|cgi|bat|rss|java|graphml|idb|lua|o|gml|prl|sls|conf|cmake|make|sln|vbe|cxx|wbf|vbs|r|wml|php|bash|applescript|fcgi|yaml|ex|exs|sh|ml|actionscript)$/,
    klass: 'code',
  },
  { reName: /\.(?:txt|rtf|doc|docx|md|pages|ppt|pptx|pptm|key|log)$/, klass: 'document' },
  { reName: /\.(?:xls|xlsx|numbers|csv)$/, klass: 'spreadsheet' },
  { reName: /\.(?:html|xhtml|htm|xml|xsd|css|styl)$/, klass: 'webcode' },
  { reName: /\.(?:mp3|ogg|opus|wav|aiff|flac)$/, klass: 'audio' },
];

/** The file-type class the client picks an attachment icon by (`unknown` when nothing matches). */
export const getFileType = (fileName: string | null | undefined, mimeType?: string | null) => {
  const name = fileName?.toLowerCase() ?? '';
  const match = FILE_TYPES.find((type) =>
    type.reType != null && mimeType != null
      ? type.reType.test(mimeType)
      : type.reName != null && name !== '' && type.reName.test(name),
  );
  return match != null ? match.klass : 'unknown';
};

/** An attachment's display name: its title (if set) with the file's extension. */
export const getAttachmentFileName = ({ filename, title }: { filename: string; title?: string | null }) => {
  if (title != null && filename != null) {
    const dot = filename.lastIndexOf('.');
    return title + (dot > 0 ? filename.substr(dot) : '');
  }
  return filename;
};
