const helper = {
  shortenSchoolName(name, maxLength = 50) {
    if (!name) return "";
    if (name.length <= maxLength) return name;

    const parts = name.split(" - ");
    if (parts.length === 2) {
      const [code, fullName] = parts;
      if (fullName.length > maxLength - code.length - 3) {
        return `${code} - ${fullName.substring(0, maxLength - code.length - 6)}...`;
      }
    }
    return name.substring(0, maxLength - 3) + "...";
  },

  async waitForElement(selector) {
    return new Promise((resolve) => {
      if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector));
      }

      const observer = new MutationObserver((mutations) => {
        if (document.querySelector(selector)) {
          observer.disconnect();
          resolve(document.querySelector(selector));
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  },

  convertTimeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  },

  createElementFromHTML(htmlString) {
    const template = document.createElement('template');
    template.innerHTML = htmlString.trim();
    return template.content;
  },

  setTextContent(element, text) {
    element.textContent = text;
  },

  clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  },

  appendChildren(parent, children) {
    if (Array.isArray(children)) {
      children.forEach(child => parent.appendChild(child));
    } else {
      parent.appendChild(children);
    }
  }
};