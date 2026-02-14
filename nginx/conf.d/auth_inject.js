(function() {
    console.log("WIKI-AUTO: v3.0");

    function getWikiCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(";");
        for(var i=0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == " ") c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) {
                var rawValue = c.substring(nameEQ.length, c.length);
                return decodeURIComponent(rawValue).replace(/^"|"$/g, "").trim();
            }
        }
        return null;
    }

    function setReactValue(input, value) {
        var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        if (setter) setter.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function tryInject() {
        var user = getWikiCookie("wiki_user");
        var pass = "SOC_Access_2026!"; // Contraseña unificada para esta prueba
        
        if (!user || window.location.pathname.indexOf("/login") === -1) return;

        var emailInput = document.querySelector("input[type=email]");
        var passInput = document.querySelector("input[type=password]");

        if (emailInput && passInput && emailInput.value === "") {
            console.log("WIKI-AUTO: Rellenando para " + user);
            setReactValue(emailInput, user);
            setReactValue(passInput, pass);
            
            setTimeout(function() {
                var btn = document.querySelector("button[type=submit]");
                if (btn) {
                    console.log("WIKI-AUTO: Pulsando login...");
                    btn.click();
                }
            }, 500);
        }
    }

    setInterval(tryInject, 1000);
})();
