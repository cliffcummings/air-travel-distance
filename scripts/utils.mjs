export async function loadTemplate(path) {
    const res = await fetch(path);
    const template = await res.text();
    return template;
}

export function renderWithTemplate(template, parentElement, data, callback) {
  parentElement.innerHTML = template;
  if (callback) {
    callback(data);
  }
}

export async function LoadHeaderFooter() {
  const headerTemplate = await loadTemplate("/partials/header.html");
  const headerElement = document.querySelector("#header");
  renderWithTemplate(headerTemplate, headerElement);

  const footerTemplate = await loadTemplate("/partials/footer.html");
  const footerElement = document.querySelector("#footer");
  renderWithTemplate(footerTemplate, footerElement);

  const lastModifiedDate = document.lastModified.split(" ")[0];
  document.querySelector('#copywrite').innerHTML = `&copy; ${new Date().getFullYear()} Cliff Cummings`;
  document.querySelector("#lastModified").textContent = `Last Modified: ${lastModifiedDate}`;
}
