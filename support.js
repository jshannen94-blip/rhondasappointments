// Minimal DC Runtime (support.js)
// Recreates enough of the DC engine to run your component.

class DCLogic {
    constructor(props = {}) {
        this.props = props;
        this.state = {};
        this._listeners = [];
    }

    setState(updater) {
        const prev = { ...this.state };
        const next = typeof updater === "function" ? updater(prev) : updater;
        this.state = { ...this.state, ...next };
        this._notify();
    }

    _notify() {
        this._listeners.forEach(fn => fn());
    }

    onUpdate(fn) {
        this._listeners.push(fn);
    }
}

// Mount the component inside <x-dc>
window.addEventListener("DOMContentLoaded", () => {
    const root = document.querySelector("x-dc");
    if (!root) return;

    // Find the DC script
    const script = document.querySelector('script[type="text/x-dc"]');
    if (!script) {
        console.error("DC script not found");
        return;
    }

    // Evaluate the component class
    const ComponentClass = eval(`(${script.innerText}); Component`);
    const comp = new ComponentClass({});

    // Initial mount
    function render() {
        const vals = comp.renderVals();
        let html = root.innerHTML;

        // Replace {{ variables }}
        html = html.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
            return vals[key] ?? "";
        });

        // Handle <sc-if>
        html = html.replace(/<sc-if[^>]*value="{{\s*([\w.]+)\s*}}"[^>]*>([\s\S]*?)<\/sc-if>/g,
            (_, key, content) => vals[key] ? content : ""
        );

        // Handle <sc-for>
        html = html.replace(
            /<sc-for[^>]*list="{{\s*([\w.]+)\s*}}"[^>]*as="(\w+)"[^>]*>([\s\S]*?)<\/sc-for>/g,
            (_, listKey, itemName, template) => {
                const list = vals[listKey] || [];
                return list.map(item => {
                    return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
                        return item[key] ?? "";
                    });
                }).join("");
            }
        );

        root.innerHTML = html;

        // Re-bind click handlers
        Object.keys(vals).forEach(key => {
            if (typeof vals[key] === "function") {
                const els = root.querySelectorAll(`[onClick="{{ ${key} }}"]`);
                els.forEach(el => {
                    el.onclick = vals[key];
                });
            }
        });
    }

    comp.onUpdate(render);
    comp.componentDidMount?.();
    render();
});
