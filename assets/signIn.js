(function () {
  let emailVerified = false;

  // e.g. { "@domain.com" : "idpHint"}
  // hints are set against IDPs in azure
  const idpRedirects = {
    "@whtest.com": "whokta",
  };

  // validate email
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // checks if email is prefilled by password manager/browser
  function checkPrefilledEmail() {
    const emailInput = document.querySelector('#api input[type="email"]');
    const continueBtn = document.getElementById("continueBtn");

    if (emailInput && continueBtn) {
      const email = emailInput.value.trim();
      const isValid = validateEmail(email);
      continueBtn.disabled = !isValid;
    }
  }

  function handleContinue() {
    // get elements
    const emailInput = document.getElementById("email");
    const container = document.getElementById("auth-container");
    const subtitle = document.getElementById("auth-subtext");

    if (!emailInput) {
      return;
    }

    const email = emailInput.value.toLowerCase().trim();

    if (!validateEmail(email)) {
      showEmailError("Please enter a valid email address");
      return;
    }

    clearEmailError();

    // Check for custom IDP domains
    if (Object.keys(idpRedirects).some((domain) => email.endsWith(domain))) {
      const domain = Object.keys(idpRedirects).find((d) => email.endsWith(d));
      if (idpRedirects[domain]) {
        // Redirect to custom IDP
        const currentUrl = new URL(window.location);
        currentUrl.searchParams.set("domain_hint", idpRedirects[domain]);
        window.history.replaceState({}, "", currentUrl.toString());
        location.reload(); // reload page with appended domain_hint

        return;
      }
    }

    // All other email domains will use default B2C sign-in flow
    emailVerified = true;
    container.classList.add("email-verified");

    if (subtitle) {
      subtitle.textContent = "Now enter your password to sign in";
    }

    // Some hacky stuff to move the forgot password link to below password input
    // once the password input is showing
    const passwordInput = document.getElementById("password");
    const forgotPassword = document.getElementById("forgotPassword");

    if (passwordInput && forgotPassword) {
      passwordInput.parentNode.insertBefore(
        forgotPassword,
        passwordInput.nextSibling
      );
      passwordInput.focus();
    }
  }

  // show errors above email input
  function showEmailError(message) {
    clearEmailError();
    const emailInput = document.getElementById("email");
    if (emailInput) {
      const errorDiv = document.createElement("div");
      errorDiv.className = "field-validation-error";
      errorDiv.textContent = message;
      emailInput.parentNode.insertBefore(errorDiv, emailInput.nextSibling);
      emailInput.style.borderColor = "#e74c3c";
    }
  }

  // use this to clear email error messages
  function clearEmailError() {
    const existingError = document.querySelector(".field-validation-error");
    if (existingError) {
      existingError.remove();
    }
    const emailInput = document.getElementById("email");
    if (emailInput) {
      emailInput.style.borderColor = "#e1e5e9";
    }
  }

  // this function waits for the page/document to be fully loaded then initialises the listeners for the form
  function monitorEmailInput() {
    // this function initialises all the listeners for the elements - is triggered once the content is loaded

    function initialiseListeners() {
      const emailInput = document.getElementById("email");
      const apiContainer = document.getElementById("api");

      if (!emailInput || !apiContainer) {
        return false;
      }
      const continueBtn = document.getElementById("continueBtn");

      // check for prefilled email after page is loaded
      checkPrefilledEmail();

      continueBtn.addEventListener("click", handleContinue);

      // listener email input
      emailInput.addEventListener("input", function () {
        const email = this.value.trim();
        const isValid = validateEmail(email);
        const container = document.getElementById("auth-container");
        const subtitle = document.getElementById("auth-subtext");

        continueBtn.disabled = !isValid;

        // Reset state if email is empty or invalid
        if (!email || !isValid) {
          emailVerified = false;
          container.classList.remove("email-verified");

          if (subtitle) {
            subtitle.textContent = "Sign in to your account to continue";
          }

          clearEmailError();
          return;
        }

        // Reset verified state when changing email
        if (emailVerified && isValid) {
          emailVerified = false;
          container.classList.remove("email-verified");

          if (subtitle) {
            subtitle.textContent = "Sign in to your account to continue";
          }
        }

        clearEmailError();
      });

      // add listeners for all types of email input changes
      emailInput.addEventListener("change", function () {
        checkPrefilledEmail();
      });

      emailInput.addEventListener("paste", function () {
        setTimeout(() => {
          checkPrefilledEmail();
        }, 100);
      });

      emailInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          if (!continueBtn.disabled) {
            handleContinue();
          }
        }
      });

      return true;
    }

    // initialises the listeners when document is loaded
    // otherwise continues to retry until successful
    if (document.readyState === "complete") {
      // If the document is already loaded, try to initialise immediately
      if (!initialiseListeners()) {
        retryInitialise();
      }

      // sometimes listeners don't get attached properly on page load
      // so we retry until they do
      function retryInitialise() {
        setTimeout(() => {
          if (!initialiseListeners()) {
            retryInitialise();
          }
        }, 1000);
      }
    }
  }

  // functions
  monitorEmailInput();
})();
