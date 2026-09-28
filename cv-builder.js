// Compatibility for previously shared CV URLs. Current links use static PDFs.
const params = new URLSearchParams(location.search);
const arabic = params.get('lang') === 'ar';
const destination = params.get('download') === 'pdf'
    ? '/Usman_Asif_Qureshi_CV' + (arabic ? '_AR' : '') + '.pdf'
    : (arabic ? '/ar/resume/' : '/resume/');
location.replace(destination);
