define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createDragBar = () => {
        const sidebar = document.createElement('div');
        sidebar.className = 'playground-dragbar';
        let left, right;
        const drag = (e) => {
            if (left && right) {
                // Get how far right the mouse is from the right
                const rightX = right.getBoundingClientRect().right;
                const offset = rightX - e.pageX;
                const screenClampLeft = window.innerWidth - 320;
                const clampedOffset = Math.min(Math.max(offset, 280), screenClampLeft);
                // Set the widths
                left.style.width = `calc(100% - ${clampedOffset}px)`;
                right.style.width = `${clampedOffset}px`;
                right.style.flexBasis = `${clampedOffset}px`;
                right.style.maxWidth = `${clampedOffset}px`;
                // Save the x coordinate of the
                if (window.localStorage) {
                    window.localStorage.setItem('dragbar-x', '' + clampedOffset);
                    window.localStorage.setItem('dragbar-window-width', '' + window.innerWidth);
                }
                // Don't allow selection
                e.stopPropagation();
                e.cancelBubble = true;
            }
        };
        sidebar.addEventListener('mousedown', e => {
            var _a;
            left = document.getElementById('editor-container');
            right = (_a = sidebar.parentElement) === null || _a === void 0 ? void 0 : _a.getElementsByClassName('playground-sidebar').item(0);
            // Handle dragging all over the screen
            document.addEventListener('mousemove', drag);
            // Remove it when you lt go anywhere
            document.addEventListener('mouseup', () => {
                document.removeEventListener('mousemove', drag);
                document.body.style.userSelect = 'auto';
            });
            // Don't allow the drag to select text accidentally
            document.body.style.userSelect = 'none';
            e.stopPropagation();
            e.cancelBubble = true;
        });
        return sidebar;
    };
    exports.sidebarHidden = () => !!window.localStorage.getItem('sidebar-hidden');
    exports.createSidebar = () => {
        const sidebar = document.createElement('div');
        sidebar.className = 'playground-sidebar';
        // This is independent of the sizing below so that you keep the same sized sidebar
        if (exports.sidebarHidden()) {
            sidebar.style.display = 'none';
        }
        if (window.localStorage && window.localStorage.getItem('dragbar-x')) {
            // Don't restore the x pos if the window isn't the same size
            if (window.innerWidth === Number(window.localStorage.getItem('dragbar-window-width'))) {
                // Set the dragger to the previous x pos
                const width = window.localStorage.getItem('dragbar-x');
                sidebar.style.width = `${width}px`;
                sidebar.style.flexBasis = `${width}px`;
                sidebar.style.maxWidth = `${width}px`;
                const left = document.getElementById('editor-container');
                left.style.width = `calc(100% - ${width}px)`;
            }
        }
        return sidebar;
    };
    exports.createTabBar = () => {
        const tabBar = document.createElement('div');
        tabBar.classList.add('playground-plugin-tabview');
        return tabBar;
    };
    exports.createPluginContainer = () => {
        const container = document.createElement('div');
        container.classList.add('playground-plugin-container');
        return container;
    };
    exports.createTabForPlugin = (plugin) => {
        const element = document.createElement('button');
        element.textContent = plugin.displayName;
        return element;
    };
    exports.activatePlugin = (plugin, previousPlugin, sandbox, tabBar, container) => {
        let newPluginTab, oldPluginTab;
        // @ts-ignore - This works at runtime
        for (const tab of tabBar.children) {
            if (tab.textContent === plugin.displayName)
                newPluginTab = tab;
            if (previousPlugin && tab.textContent === previousPlugin.displayName)
                oldPluginTab = tab;
        }
        // @ts-ignore
        if (!newPluginTab)
            throw new Error('Could not get a tab for the plugin: ' + plugin.displayName);
        // Tell the old plugin it's getting the boot
        // @ts-ignore
        if (previousPlugin && oldPluginTab) {
            if (previousPlugin.willUnmount)
                previousPlugin.willUnmount(sandbox, container);
            oldPluginTab.classList.remove('active');
        }
        // Wipe the sidebar
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        // Start booting up the new plugin
        newPluginTab.classList.add('active');
        // Tell the new plugin to start doing some work
        if (plugin.willMount)
            plugin.willMount(sandbox, container);
        if (plugin.modelChanged)
            plugin.modelChanged(sandbox, sandbox.getModel());
        if (plugin.modelChangedDebounce)
            plugin.modelChangedDebounce(sandbox, sandbox.getModel());
        if (plugin.didMount)
            plugin.didMount(sandbox, container);
        // Let the previous plugin do any slow work after it's all done
        if (previousPlugin && previousPlugin.didUnmount)
            previousPlugin.didUnmount(sandbox, container);
    };
    const toggleIconWhenOpen = '&#x21E5;';
    const toggleIconWhenClosed = '&#x21E4;';
    exports.setupSidebarToggle = () => {
        const toggle = document.getElementById('sidebar-toggle');
        const updateToggle = () => {
            const sidebarShowing = !exports.sidebarHidden();
            toggle.innerHTML = sidebarShowing ? toggleIconWhenOpen : toggleIconWhenClosed;
            toggle.setAttribute('aria-label', sidebarShowing ? 'Hide Sidebar' : 'Show Sidebar');
        };
        toggle.onclick = () => {
            const newState = !exports.sidebarHidden();
            const sidebar = window.document.querySelector('.playground-sidebar');
            if (newState) {
                localStorage.setItem('sidebar-hidden', 'true');
                sidebar.style.display = 'none';
            }
            else {
                localStorage.removeItem('sidebar-hidden');
                sidebar.style.display = 'block';
            }
            updateToggle();
            return false;
        };
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlRWxlbWVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wbGF5Z3JvdW5kL3NyYy9jcmVhdGVFbGVtZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7SUFJYSxRQUFBLGFBQWEsR0FBRyxHQUFHLEVBQUU7UUFDaEMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM3QyxPQUFPLENBQUMsU0FBUyxHQUFHLG9CQUFvQixDQUFBO1FBRXhDLElBQUksSUFBaUIsRUFBRSxLQUFrQixDQUFBO1FBQ3pDLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBYSxFQUFFLEVBQUU7WUFDN0IsSUFBSSxJQUFJLElBQUksS0FBSyxFQUFFO2dCQUNqQixnREFBZ0Q7Z0JBQ2hELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLEtBQUssQ0FBQTtnQkFDbEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUE7Z0JBQy9CLE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFBO2dCQUMvQyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFBO2dCQUV0RSxpQkFBaUI7Z0JBQ2pCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLGVBQWUsYUFBYSxLQUFLLENBQUE7Z0JBQ3BELEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEdBQUcsYUFBYSxJQUFJLENBQUE7Z0JBQ3hDLEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLEdBQUcsYUFBYSxJQUFJLENBQUE7Z0JBQzVDLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLEdBQUcsYUFBYSxJQUFJLENBQUE7Z0JBRTNDLCtC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QUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQbGF5Z3JvdW5kUGx1Z2luIH0gZnJvbSAnLidcblxudHlwZSBTYW5kYm94ID0gaW1wb3J0KCd0eXBlc2NyaXB0LXNhbmRib3gnKS5TYW5kYm94XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVEcmFnQmFyID0gKCkgPT4ge1xuICBjb25zdCBzaWRlYmFyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgc2lkZWJhci5jbGFzc05hbWUgPSAncGxheWdyb3VuZC1kcmFnYmFyJ1xuXG4gIGxldCBsZWZ0OiBIVE1MRWxlbWVudCwgcmlnaHQ6IEhUTUxFbGVtZW50XG4gIGNvbnN0IGRyYWcgPSAoZTogTW91c2VFdmVudCkgPT4ge1xuICAgIGlmIChsZWZ0ICYmIHJpZ2h0KSB7XG4gICAgICAvLyBHZXQgaG93IGZhciByaWdodCB0aGUgbW91c2UgaXMgZnJvbSB0aGUgcmlnaHRcbiAgICAgIGNvbnN0IHJpZ2h0WCA9IHJpZ2h0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnJpZ2h0XG4gICAgICBjb25zdCBvZmZzZXQgPSByaWdodFggLSBlLnBhZ2VYXG4gICAgICBjb25zdCBzY3JlZW5DbGFtcExlZnQgPSB3aW5kb3cuaW5uZXJXaWR0aCAtIDMyMFxuICAgICAgY29uc3QgY2xhbXBlZE9mZnNldCA9IE1hdGgubWluKE1hdGgubWF4KG9mZnNldCwgMjgwKSwgc2NyZWVuQ2xhbXBMZWZ0KVxuXG4gICAgICAvLyBTZXQgdGhlIHdpZHRoc1xuICAgICAgbGVmdC5zdHlsZS53aWR0aCA9IGBjYWxjKDEwMCUgLSAke2NsYW1wZWRPZmZzZXR9cHgpYFxuICAgICAgcmlnaHQuc3R5bGUud2lkdGggPSBgJHtjbGFtcGVkT2Zmc2V0fXB4YFxuICAgICAgcmlnaHQuc3R5bGUuZmxleEJhc2lzID0gYCR7Y2xhbXBlZE9mZnNldH1weGBcbiAgICAgIHJpZ2h0LnN0eWxlLm1heFdpZHRoID0gYCR7Y2xhbXBlZE9mZnNldH1weGBcblxuICAgICAgLy8gU2F2ZSB0aGUgeCBjb29yZGluYXRlIG9mIHRoZVxuICAgICAgaWYgKHdpbmRvdy5sb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdkcmFnYmFyLXgnLCAnJyArIGNsYW1wZWRPZmZzZXQpXG4gICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZHJhZ2Jhci13aW5kb3ctd2lkdGgnLCAnJyArIHdpbmRvdy5pbm5lcldpZHRoKVxuICAgICAgfVxuXG4gICAgICAvLyBEb24ndCBhbGxvdyBzZWxlY3Rpb25cbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgICAgIGUuY2FuY2VsQnViYmxlID0gdHJ1ZVxuICAgIH1cbiAgfVxuXG4gIHNpZGViYXIuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgZSA9PiB7XG4gICAgbGVmdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlZGl0b3ItY29udGFpbmVyJykhXG4gICAgcmlnaHQgPSBzaWRlYmFyLnBhcmVudEVsZW1lbnQ/LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3BsYXlncm91bmQtc2lkZWJhcicpLml0ZW0oMCkhIGFzIGFueVxuICAgIC8vIEhhbmRsZSBkcmFnZ2luZyBhbGwgb3ZlciB0aGUgc2NyZWVuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZHJhZylcbiAgICAvLyBSZW1vdmUgaXQgd2hlbiB5b3UgbHQgZ28gYW55d2hlcmVcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgKCkgPT4ge1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZHJhZylcbiAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUudXNlclNlbGVjdCA9ICdhdXRvJ1xuICAgIH0pXG5cbiAgICAvLyBEb24ndCBhbGxvdyB0aGUgZHJhZyB0byBzZWxlY3QgdGV4dCBhY2NpZGVudGFsbHlcbiAgICBkb2N1bWVudC5ib2R5LnN0eWxlLnVzZXJTZWxlY3QgPSAnbm9uZSdcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgZS5jYW5jZWxCdWJibGUgPSB0cnVlXG4gIH0pXG5cbiAgcmV0dXJuIHNpZGViYXJcbn1cblxuZXhwb3J0IGNvbnN0IHNpZGViYXJIaWRkZW4gPSAoKSA9PiAhIXdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnc2lkZWJhci1oaWRkZW4nKVxuXG5leHBvcnQgY29uc3QgY3JlYXRlU2lkZWJhciA9ICgpID0+IHtcbiAgY29uc3Qgc2lkZWJhciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIHNpZGViYXIuY2xhc3NOYW1lID0gJ3BsYXlncm91bmQtc2lkZWJhcidcblxuICAvLyBUaGlzIGlzIGluZGVwZW5kZW50IG9mIHRoZSBzaXppbmcgYmVsb3cgc28gdGhhdCB5b3Uga2VlcCB0aGUgc2FtZSBzaXplZCBzaWRlYmFyXG4gIGlmIChzaWRlYmFySGlkZGVuKCkpIHtcbiAgICBzaWRlYmFyLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSdcbiAgfVxuXG4gIGlmICh3aW5kb3cubG9jYWxTdG9yYWdlICYmIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZHJhZ2Jhci14JykpIHtcbiAgICAvLyBEb24ndCByZXN0b3JlIHRoZSB4IHBvcyBpZiB0aGUgd2luZG93IGlzbid0IHRoZSBzYW1lIHNpemVcbiAgICBpZiAod2luZG93LmlubmVyV2lkdGggPT09IE51bWJlcih3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2RyYWdiYXItd2luZG93LXdpZHRoJykpKSB7XG4gICAgICAvLyBTZXQgdGhlIGRyYWdnZXIgdG8gdGhlIHByZXZpb3VzIHggcG9zXG4gICAgICBjb25zdCB3aWR0aCA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZHJhZ2Jhci14JylcbiAgICAgIHNpZGViYXIuc3R5bGUud2lkdGggPSBgJHt3aWR0aH1weGBcbiAgICAgIHNpZGViYXIuc3R5bGUuZmxleEJhc2lzID0gYCR7d2lkdGh9cHhgXG4gICAgICBzaWRlYmFyLnN0eWxlLm1heFdpZHRoID0gYCR7d2lkdGh9cHhgXG5cbiAgICAgIGNvbnN0IGxlZnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZWRpdG9yLWNvbnRhaW5lcicpIVxuICAgICAgbGVmdC5zdHlsZS53aWR0aCA9IGBjYWxjKDEwMCUgLSAke3dpZHRofXB4KWBcbiAgICB9XG4gIH1cblxuICByZXR1cm4gc2lkZWJhclxufVxuXG5leHBvcnQgY29uc3QgY3JlYXRlVGFiQmFyID0gKCkgPT4ge1xuICBjb25zdCB0YWJCYXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICB0YWJCYXIuY2xhc3NMaXN0LmFkZCgncGxheWdyb3VuZC1wbHVnaW4tdGFidmlldycpXG4gIHJldHVybiB0YWJCYXJcbn1cblxuZXhwb3J0IGNvbnN0IGNyZWF0ZVBsdWdpbkNvbnRhaW5lciA9ICgpID0+IHtcbiAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgY29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3BsYXlncm91bmQtcGx1Z2luLWNvbnRhaW5lcicpXG4gIHJldHVybiBjb250YWluZXJcbn1cblxuZXhwb3J0IGNvbnN0IGNyZWF0ZVRhYkZvclBsdWdpbiA9IChwbHVnaW46IFBsYXlncm91bmRQbHVnaW4pID0+IHtcbiAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpXG4gIGVsZW1lbnQudGV4dENvbnRlbnQgPSBwbHVnaW4uZGlzcGxheU5hbWVcbiAgcmV0dXJuIGVsZW1lbnRcbn1cblxuZXhwb3J0IGNvbnN0IGFjdGl2YXRlUGx1Z2luID0gKFxuICBwbHVnaW46IFBsYXlncm91bmRQbHVnaW4sXG4gIHByZXZpb3VzUGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luIHwgdW5kZWZpbmVkLFxuICBzYW5kYm94OiBTYW5kYm94LFxuICB0YWJCYXI6IEhUTUxEaXZFbGVtZW50LFxuICBjb250YWluZXI6IEhUTUxEaXZFbGVtZW50XG4pID0+IHtcbiAgbGV0IG5ld1BsdWdpblRhYjogRWxlbWVudCwgb2xkUGx1Z2luVGFiOiBFbGVtZW50XG4gIC8vIEB0cy1pZ25vcmUgLSBUaGlzIHdvcmtzIGF0IHJ1bnRpbWVcbiAgZm9yIChjb25zdCB0YWIgb2YgdGFiQmFyLmNoaWxkcmVuKSB7XG4gICAgaWYgKHRhYi50ZXh0Q29udGVudCA9PT0gcGx1Z2luLmRpc3BsYXlOYW1lKSBuZXdQbHVnaW5UYWIgPSB0YWJcbiAgICBpZiAocHJldmlvdXNQbHVnaW4gJiYgdGFiLnRleHRDb250ZW50ID09PSBwcmV2aW91c1BsdWdpbi5kaXNwbGF5TmFtZSkgb2xkUGx1Z2luVGFiID0gdGFiXG4gIH1cblxuICAvLyBAdHMtaWdub3JlXG4gIGlmICghbmV3UGx1Z2luVGFiKSB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBnZXQgYSB0YWIgZm9yIHRoZSBwbHVnaW46ICcgKyBwbHVnaW4uZGlzcGxheU5hbWUpXG5cbiAgLy8gVGVsbCB0aGUgb2xkIHBsdWdpbiBpdCdzIGdldHRpbmcgdGhlIGJvb3RcbiAgLy8gQHRzLWlnbm9yZVxuICBpZiAocHJldmlvdXNQbHVnaW4gJiYgb2xkUGx1Z2luVGFiKSB7XG4gICAgaWYgKHByZXZpb3VzUGx1Z2luLndpbGxVbm1vdW50KSBwcmV2aW91c1BsdWdpbi53aWxsVW5tb3VudChzYW5kYm94LCBjb250YWluZXIpXG4gICAgb2xkUGx1Z2luVGFiLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpXG4gIH1cblxuICAvLyBXaXBlIHRoZSBzaWRlYmFyXG4gIHdoaWxlIChjb250YWluZXIuZmlyc3RDaGlsZCkge1xuICAgIGNvbnRhaW5lci5yZW1vdmVDaGlsZChjb250YWluZXIuZmlyc3RDaGlsZClcbiAgfVxuXG4gIC8vIFN0YXJ0IGJvb3RpbmcgdXAgdGhlIG5ldyBwbHVnaW5cbiAgbmV3UGx1Z2luVGFiLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpXG5cbiAgLy8gVGVsbCB0aGUgbmV3IHBsdWdpbiB0byBzdGFydCBkb2luZyBzb21lIHdvcmtcbiAgaWYgKHBsdWdpbi53aWxsTW91bnQpIHBsdWdpbi53aWxsTW91bnQoc2FuZGJveCwgY29udGFpbmVyKVxuICBpZiAocGx1Z2luLm1vZGVsQ2hhbmdlZCkgcGx1Z2luLm1vZGVsQ2hhbmdlZChzYW5kYm94LCBzYW5kYm94LmdldE1vZGVsKCkpXG4gIGlmIChwbHVnaW4ubW9kZWxDaGFuZ2VkRGVib3VuY2UpIHBsdWdpbi5tb2RlbENoYW5nZWREZWJvdW5jZShzYW5kYm94LCBzYW5kYm94LmdldE1vZGVsKCkpXG4gIGlmIChwbHVnaW4uZGlkTW91bnQpIHBsdWdpbi5kaWRNb3VudChzYW5kYm94LCBjb250YWluZXIpXG5cbiAgLy8gTGV0IHRoZSBwcmV2aW91cyBwbHVnaW4gZG8gYW55IHNsb3cgd29yayBhZnRlciBpdCdzIGFsbCBkb25lXG4gIGlmIChwcmV2aW91c1BsdWdpbiAmJiBwcmV2aW91c1BsdWdpbi5kaWRVbm1vdW50KSBwcmV2aW91c1BsdWdpbi5kaWRVbm1vdW50KHNhbmRib3gsIGNvbnRhaW5lcilcbn1cblxuY29uc3QgdG9nZ2xlSWNvbldoZW5PcGVuID0gJyYjeDIxRTU7J1xuY29uc3QgdG9nZ2xlSWNvbldoZW5DbG9zZWQgPSAnJiN4MjFFNDsnXG5cbmV4cG9ydCBjb25zdCBzZXR1cFNpZGViYXJUb2dnbGUgPSAoKSA9PiB7XG4gIGNvbnN0IHRvZ2dsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaWRlYmFyLXRvZ2dsZScpIVxuXG4gIGNvbnN0IHVwZGF0ZVRvZ2dsZSA9ICgpID0+IHtcbiAgICBjb25zdCBzaWRlYmFyU2hvd2luZyA9ICFzaWRlYmFySGlkZGVuKClcbiAgICB0b2dnbGUuaW5uZXJIVE1MID0gc2lkZWJhclNob3dpbmcgPyB0b2dnbGVJY29uV2hlbk9wZW4gOiB0b2dnbGVJY29uV2hlbkNsb3NlZFxuICAgIHRvZ2dsZS5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLCBzaWRlYmFyU2hvd2luZyA/ICdIaWRlIFNpZGViYXInIDogJ1Nob3cgU2lkZWJhcicpXG4gIH1cblxuICB0b2dnbGUub25jbGljayA9ICgpID0+IHtcbiAgICBjb25zdCBuZXdTdGF0ZSA9ICFzaWRlYmFySGlkZGVuKClcblxuICAgIGNvbnN0IHNpZGViYXIgPSB3aW5kb3cuZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnBsYXlncm91bmQtc2lkZWJhcicpIGFzIEhUTUxEaXZFbGVtZW50XG4gICAgaWYgKG5ld1N0YXRlKSB7XG4gICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnc2lkZWJhci1oaWRkZW4nLCAndHJ1ZScpXG4gICAgICBzaWRlYmFyLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSdcbiAgICB9IGVsc2Uge1xuICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ3NpZGViYXItaGlkZGVuJylcbiAgICAgIHNpZGViYXIuc3R5bGUuZGlzcGxheSA9ICdibG9jaydcbiAgICB9XG4gICAgdXBkYXRlVG9nZ2xlKClcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuIl19