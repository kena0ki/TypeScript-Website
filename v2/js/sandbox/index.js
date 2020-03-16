var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "./typeAcquisition", "./theme", "./compilerOptions", "./vendor/lzstring.min", "./releases", "./getInitialCode", "./twoslashSupport", "./vendor/typescript-vfs"], function (require, exports, typeAcquisition_1, theme_1, compilerOptions_1, lzstring_min_1, releases_1, getInitialCode_1, twoslashSupport_1, tsvfs) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    lzstring_min_1 = __importDefault(lzstring_min_1);
    tsvfs = __importStar(tsvfs);
    const languageType = (config) => (config.useJavaScript ? 'javascript' : 'typescript');
    /** Default Monaco settings for playground */
    const sharedEditorOptions = {
        automaticLayout: true,
        scrollBeyondLastLine: true,
        scrollBeyondLastColumn: 3,
        minimap: {
            enabled: false,
        },
    };
    /** The default settings which we apply a partial over */
    function defaultPlaygroundSettings() {
        const config = {
            text: '',
            domID: '',
            compilerOptions: {},
            acquireTypes: true,
            useJavaScript: false,
            supportTwoslashCompilerOptions: false,
            logger: console,
        };
        return config;
    }
    exports.defaultPlaygroundSettings = defaultPlaygroundSettings;
    function defaultFilePath(config, compilerOptions, monaco) {
        const isJSX = compilerOptions.jsx !== monaco.languages.typescript.JsxEmit.None;
        const fileExt = config.useJavaScript ? 'js' : 'ts';
        const ext = isJSX ? fileExt + 'x' : fileExt;
        return 'input.' + ext;
    }
    /** Creates a monaco file reference, basically a fancy path */
    function createFileUri(config, compilerOptions, monaco) {
        return monaco.Uri.file(defaultFilePath(config, compilerOptions, monaco));
    }
    /** Creates a sandbox editor, and returns a set of useful functions and the editor */
    exports.createTypeScriptSandbox = (partialConfig, monaco, ts) => {
        const config = Object.assign(Object.assign({}, defaultPlaygroundSettings()), partialConfig);
        if (!('domID' in config) && !('elementToAppend' in config))
            throw new Error('You did not provide a domID or elementToAppend');
        const compilerDefaults = compilerOptions_1.getDefaultSandboxCompilerOptions(config, monaco);
        const language = languageType(config);
        const filePath = createFileUri(config, compilerDefaults, monaco);
        const element = 'domID' in config ? document.getElementById(config.domID) : config.elementToAppend;
        const defaultText = config.suppressAutomaticallyGettingDefaultText
            ? config.text
            : getInitialCode_1.getInitialCode(config.text, document.location);
        const model = monaco.editor.createModel(defaultText, language, filePath);
        monaco.editor.defineTheme('sandbox', theme_1.sandboxTheme);
        monaco.editor.defineTheme('sandbox-dark', theme_1.sandboxThemeDark);
        monaco.editor.setTheme('sandbox');
        const monacoSettings = Object.assign({ model }, sharedEditorOptions, config.monacoSettings || {});
        const editor = monaco.editor.create(element, monacoSettings);
        const getWorker = config.useJavaScript
            ? monaco.languages.typescript.getJavaScriptWorker
            : monaco.languages.typescript.getTypeScriptWorker;
        const defaults = config.useJavaScript
            ? monaco.languages.typescript.javascriptDefaults
            : monaco.languages.typescript.typescriptDefaults;
        // In the future it'd be good to add support for an 'add many files'
        const addLibraryToRuntime = (code, path) => {
            defaults.addExtraLib(code, path);
            config.logger.log(`[ATA] Adding ${path} to runtime`);
        };
        const getTwoSlashComplierOptions = twoslashSupport_1.extractTwoSlashComplierOptions(ts);
        // Then update it when the model changes, perhaps this could be a debounced plugin instead in the future?
        editor.onDidChangeModelContent(() => {
            const code = editor.getModel().getValue();
            if (config.supportTwoslashCompilerOptions) {
                const configOpts = getTwoSlashComplierOptions(code);
                updateCompilerSettings(configOpts);
            }
            if (config.acquireTypes) {
                typeAcquisition_1.detectNewImportsToAcquireTypeFor(code, addLibraryToRuntime, window.fetch.bind(window), config);
            }
        });
        // Grab the compiler flags via the query params
        let compilerOptions;
        if (!config.suppressAutomaticallyGettingCompilerFlags) {
            const params = new URLSearchParams(location.search);
            let queryParamCompilerOptions = compilerOptions_1.getCompilerOptionsFromParams(compilerDefaults, params);
            if (Object.keys(queryParamCompilerOptions).length)
                config.logger.log('[Compiler] Found compiler options in query params: ', queryParamCompilerOptions);
            compilerOptions = Object.assign(Object.assign({}, compilerDefaults), queryParamCompilerOptions);
        }
        else {
            compilerOptions = compilerDefaults;
        }
        config.logger.log('[Compiler] Set compiler options: ', compilerOptions);
        defaults.setCompilerOptions(compilerOptions);
        // Grab types last so that it logs in a logical way
        if (config.acquireTypes) {
            // Take the code from the editor right away
            const code = editor.getModel().getValue();
            typeAcquisition_1.detectNewImportsToAcquireTypeFor(code, addLibraryToRuntime, window.fetch.bind(window), config);
        }
        // To let clients plug into compiler settings changes
        let didUpdateCompilerSettings = (opts) => { };
        const updateCompilerSettings = (opts) => {
            config.logger.log('[Compiler] Updating compiler options: ', opts);
            compilerOptions = Object.assign(Object.assign({}, opts), compilerOptions);
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const updateCompilerSetting = (key, value) => {
            config.logger.log('[Compiler] Setting compiler options ', key, 'to', value);
            compilerOptions[key] = value;
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const setCompilerSettings = (opts) => {
            config.logger.log('[Compiler] Setting compiler options: ', opts);
            compilerOptions = opts;
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const getCompilerOptions = () => {
            return compilerOptions;
        };
        const setDidUpdateCompilerSettings = (func) => {
            didUpdateCompilerSettings = func;
        };
        /** Gets the results of compiling your editor's code */
        const getEmitResult = () => __awaiter(void 0, void 0, void 0, function* () {
            const model = editor.getModel();
            const client = yield getWorkerProcess();
            return yield client.getEmitOutput(model.uri.toString());
        });
        /** Gets the JS  of compiling your editor's code */
        const getRunnableJS = () => __awaiter(void 0, void 0, void 0, function* () {
            if (config.useJavaScript) {
                return getText();
            }
            const result = yield getEmitResult();
            const firstJS = result.outputFiles.find((o) => o.name.endsWith('.js') || o.name.endsWith('.jsx'));
            return (firstJS && firstJS.text) || '';
        });
        /** Gets the DTS for the JS/TS  of compiling your editor's code */
        const getDTSForCode = () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield getEmitResult();
            return result.outputFiles.find((o) => o.name.endsWith('.d.ts')).text;
        });
        const getWorkerProcess = () => __awaiter(void 0, void 0, void 0, function* () {
            const worker = yield getWorker();
            // @ts-ignore
            return yield worker(model.uri);
        });
        const getDomNode = () => editor.getDomNode();
        const getModel = () => editor.getModel();
        const getText = () => getModel().getValue();
        const setText = (text) => getModel().setValue(text);
        /**
         * Warning: Runs on the main thread
         */
        const createTSProgram = () => __awaiter(void 0, void 0, void 0, function* () {
            const fsMap = yield tsvfs.createDefaultMapFromCDN(compilerOptions, ts.version, true, ts, lzstring_min_1.default);
            fsMap.set(filePath.path, getText());
            const system = tsvfs.createSystem(fsMap);
            const host = tsvfs.createVirtualCompilerHost(system, compilerOptions, ts);
            const program = ts.createProgram({
                rootNames: [...fsMap.keys()],
                options: compilerOptions,
                host: host.compilerHost,
            });
            return program;
        });
        const getAST = () => __awaiter(void 0, void 0, void 0, function* () {
            const program = yield createTSProgram();
            program.emit();
            return program.getSourceFile(filePath.path);
        });
        // Pass along the supported releases for the playground
        const supportedVersions = releases_1.supportedReleases;
        return {
            /** The same config you passed in */
            config,
            /** A list of TypeScript versions you can use with the TypeScript sandbox */
            supportedVersions,
            /** The monaco editor instance */
            editor,
            /** Either "typescript" or "javascript" depending on your config */
            language,
            /** The outer monaco module, the result of require("monaco-editor")  */
            monaco,
            /** Gets a monaco-typescript worker, this will give you access to a language server. Note: prefer this for language server work because it happens on a webworker . */
            getWorkerProcess,
            /** A copy of require("typescript-vfs") this can be used to quickly set up an in-memory compiler runs for ASTs, or to get complex language server results (anything above has to be serialized when passed)*/
            tsvfs,
            /** Get all the different emitted files after TypeScript is run */
            getEmitResult,
            /** Gets just the JavaScript for your sandbox, will transpile if in TS only */
            getRunnableJS,
            /** Gets the DTS output of the main code in the editor */
            getDTSForCode,
            /** The monaco-editor dom node, used for showing/hiding the editor */
            getDomNode,
            /** The model is an object which monaco uses to keep track of text in the editor. Use this to directly modify the text in the editor */
            getModel,
            /** Gets the text of the main model, which is the text in the editor */
            getText,
            /** Shortcut for setting the model's text content which would update the editor */
            setText,
            /** Gets the AST of the current text in monaco - uses `createTSProgram`, so the performance caveat applies there too */
            getAST,
            /** The module you get from require("typescript") */
            ts,
            /** Create a new Program, a TypeScript data model which represents the entire project.
             *
             * The first time this is called it has to download all the DTS files which is needed for an exact compiler run. Which
             * at max is about 1.5MB - after that subsequent downloads of dts lib files come from localStorage.
             *
             * Try to use this sparingly as it can be computationally expensive, at the minimum you should be using the debounced setup.
             *
             * TODO: It would be good to create an easy way to have a single program instance which is updated for you
             * when the monaco model changes.
             */
            createTSProgram,
            /** The Sandbox's default compiler options  */
            compilerDefaults,
            /** The Sandbox's current compiler options */
            getCompilerOptions,
            /** Replace the Sandbox's compiler options */
            setCompilerSettings,
            /** Overwrite the Sandbox's compiler options */
            updateCompilerSetting,
            /** Update a single compiler option in the SAndbox */
            updateCompilerSettings,
            /** A way to get callbacks when compiler settings have changed */
            setDidUpdateCompilerSettings,
            /** A copy of lzstring, which is used to archive/unarchive code */
            lzstring: lzstring_min_1.default,
            /** Returns compiler options found in the params of the current page */
            getURLQueryWithCompilerOptions: compilerOptions_1.getURLQueryWithCompilerOptions,
            /** Returns compiler options in the source code using twoslash notation */
            getTwoSlashComplierOptions,
            /** Gets to the current monaco-language, this is how you talk to the background webworkers */
            languageServiceDefaults: defaults,
        };
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zYW5kYm94L3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFrREEsTUFBTSxZQUFZLEdBQUcsQ0FBQyxNQUF3QixFQUFFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUE7SUFFdkcsNkNBQTZDO0lBQzdDLE1BQU0sbUJBQW1CLEdBQWtEO1FBQ3pFLGVBQWUsRUFBRSxJQUFJO1FBQ3JCLG9CQUFvQixFQUFFLElBQUk7UUFDMUIsc0JBQXNCLEVBQUUsQ0FBQztRQUN6QixPQUFPLEVBQUU7WUFDUCxPQUFPLEVBQUUsS0FBSztTQUNmO0tBQ0YsQ0FBQTtJQUVELHlEQUF5RDtJQUN6RCxTQUFnQix5QkFBeUI7UUFDdkMsTUFBTSxNQUFNLEdBQXFCO1lBQy9CLElBQUksRUFBRSxFQUFFO1lBQ1IsS0FBSyxFQUFFLEVBQUU7WUFDVCxlQUFlLEVBQUUsRUFBRTtZQUNuQixZQUFZLEVBQUUsSUFBSTtZQUNsQixhQUFhLEVBQUUsS0FBSztZQUNwQiw4QkFBOEIsRUFBRSxLQUFLO1lBQ3JDLE1BQU0sRUFBRSxPQUFPO1NBQ2hCLENBQUE7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNmLENBQUM7SUFYRCw4REFXQztJQUVELFNBQVMsZUFBZSxDQUFDLE1BQXdCLEVBQUUsZUFBZ0MsRUFBRSxNQUFjO1FBQ2pHLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxHQUFHLEtBQUssTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQTtRQUM5RSxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtRQUNsRCxNQUFNLEdBQUcs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bEUsYUFBYTtZQUNiLDhFQUE4RTtZQUM5RSxhQUFhO1lBQ2IseURBQXlEO1lBQ3pELGFBQWE7WUFDYixxRUFBcUU7WUFDckUsVUFBVTtZQUNWLHVJQUF1STtZQUN2SSxRQUFRO1lBQ1IsdUVBQXVFO1lBQ3ZFLE9BQU87WUFDUCxrRkFBa0Y7WUFDbEYsT0FBTztZQUNQLHVIQUF1SDtZQUN2SCxNQUFNO1lBQ04sb0RBQW9EO1lBQ3BELEVBQUU7WUFDRjs7Ozs7Ozs7O2VBU0c7WUFDSCxlQUFlO1lBQ2YsOENBQThDO1lBQzlDLGdCQUFnQjtZQUNoQiw2Q0FBNkM7WUFDN0Msa0JBQWtCO1lBQ2xCLDZDQUE2QztZQUM3QyxtQkFBbUI7WUFDbkIsK0NBQStDO1lBQy9DLHFCQUFxQjtZQUNyQixxREFBcUQ7WUFDckQsc0JBQXNCO1lBQ3RCLGlFQUFpRTtZQUNqRSw0QkFBNEI7WUFDNUIsa0VBQWtFO1lBQ2xFLFFBQVEsRUFBUixzQkFBUTtZQUNSLHVFQUF1RTtZQUN2RSw4QkFBOEIsRUFBOUIsZ0RBQThCO1lBQzlCLDBFQUEwRTtZQUMxRSwwQkFBMEI7WUFDMUIsNkZBQTZGO1lBQzdGLHVCQUF1QixFQUFFLFFBQVE7U0FDbEMsQ0FBQTtJQUNILENBQUMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGRldGVjdE5ld0ltcG9ydHNUb0FjcXVpcmVUeXBlRm9yIH0gZnJvbSAnLi90eXBlQWNxdWlzaXRpb24nXG5pbXBvcnQgeyBzYW5kYm94VGhlbWUsIHNhbmRib3hUaGVtZURhcmsgfSBmcm9tICcuL3RoZW1lJ1xuaW1wb3J0IHsgVHlwZVNjcmlwdFdvcmtlciB9IGZyb20gJy4vdHNXb3JrZXInXG5pbXBvcnQge1xuICBnZXREZWZhdWx0U2FuZGJveENvbXBpbGVyT3B0aW9ucyxcbiAgZ2V0Q29tcGlsZXJPcHRpb25zRnJvbVBhcmFtcyxcbiAgZ2V0VVJMUXVlcnlXaXRoQ29tcGlsZXJPcHRpb25zLFxufSBmcm9tICcuL2NvbXBpbGVyT3B0aW9ucydcbmltcG9ydCBsenN0cmluZyBmcm9tICcuL3ZlbmRvci9senN0cmluZy5taW4nXG5pbXBvcnQgeyBzdXBwb3J0ZWRSZWxlYXNlcyB9IGZyb20gJy4vcmVsZWFzZXMnXG5pbXBvcnQgeyBnZXRJbml0aWFsQ29kZSB9IGZyb20gJy4vZ2V0SW5pdGlhbENvZGUnXG5pbXBvcnQgeyBleHRyYWN0VHdvU2xhc2hDb21wbGllck9wdGlvbnMgfSBmcm9tICcuL3R3b3NsYXNoU3VwcG9ydCdcbmltcG9ydCAqIGFzIHRzdmZzIGZyb20gJy4vdmVuZG9yL3R5cGVzY3JpcHQtdmZzJ1xuXG50eXBlIENvbXBpbGVyT3B0aW9ucyA9IGltcG9ydCgnbW9uYWNvLWVkaXRvcicpLmxhbmd1YWdlcy50eXBlc2NyaXB0LkNvbXBpbGVyT3B0aW9uc1xudHlwZSBNb25hY28gPSB0eXBlb2YgaW1wb3J0KCdtb25hY28tZWRpdG9yJylcblxuLyoqXG4gKiBUaGVzZSBhcmUgc2V0dGluZ3MgZm9yIHRoZSBwbGF5Z3JvdW5kIHdoaWNoIGFyZSB0aGUgZXF1aXZhbGVudCB0byBwcm9wcyBpbiBSZWFjdFxuICogYW55IGNoYW5nZXMgdG8gaXQgc2hvdWxkIHJlcXVpcmUgYSBuZXcgc2V0dXAgb2YgdGhlIHBsYXlncm91bmRcbiAqL1xuZXhwb3J0IHR5cGUgUGxheWdyb3VuZENvbmZpZyA9IHtcbiAgLyoqIFRoZSBkZWZhdWx0IHNvdXJjZSBjb2RlIGZvciB0aGUgcGxheWdyb3VuZCAqL1xuICB0ZXh0OiBzdHJpbmdcbiAgLyoqIFNob3VsZCBpdCBydW4gdGhlIHRzIG9yIGpzIElERSBzZXJ2aWNlcyAqL1xuICB1c2VKYXZhU2NyaXB0OiBib29sZWFuXG4gIC8qKiBDb21waWxlciBvcHRpb25zIHdoaWNoIGFyZSBhdXRvbWF0aWNhbGx5IGp1c3QgZm9yd2FyZGVkIG9uICovXG4gIGNvbXBpbGVyT3B0aW9uczogQ29tcGlsZXJPcHRpb25zXG4gIC8qKiBPcHRpb25hbCBtb25hY28gc2V0dGluZ3Mgb3ZlcnJpZGVzICovXG4gIG1vbmFjb1NldHRpbmdzPzogaW1wb3J0KCdtb25hY28tZWRpdG9yJykuZWRpdG9yLklFZGl0b3JPcHRpb25zXG4gIC8qKiBBY3F1aXJlIHR5cGVzIHZpYSB0eXBlIGFjcXVpc2l0aW9uICovXG4gIGFjcXVpcmVUeXBlczogYm9vbGVhblxuICAvKiogU3VwcG9ydCB0d29zbGFzaCBjb21waWxlciBvcHRpb25zICovXG4gIHN1cHBvcnRUd29zbGFzaENvbXBpbGVyT3B0aW9uczogYm9vbGVhblxuICAvKiogR2V0IHRoZSB0ZXh0IHZpYSBxdWVyeSBwYXJhbXMgYW5kIGxvY2FsIHN0b3JhZ2UsIHVzZWZ1bCB3aGVuIHRoZSBlZGl0b3IgaXMgdGhlIG1haW4gZXhwZXJpZW5jZSAqL1xuICBzdXBwcmVzc0F1dG9tYXRpY2FsbHlHZXR0aW5nRGVmYXVsdFRleHQ/OiB0cnVlXG4gIC8qKiBTdXBwcmVzcyBzZXR0aW5nIGNvbXBpbGVyIG9wdGlvbnMgZnJvbSB0aGUgY29tcGlsZXIgZmxhZ3MgZnJvbSBxdWVyeSBwYXJhbXMgKi9cbiAgc3VwcHJlc3NBdXRvbWF0aWNhbGx5R2V0dGluZ0NvbXBpbGVyRmxhZ3M/OiB0cnVlXG4gIC8qKiBMb2dnaW5nIHN5c3RlbSAqL1xuICBsb2dnZXI6IHtcbiAgICBsb2c6ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZFxuICAgIGVycm9yOiAoLi4uYXJnczogYW55W10pID0+IHZvaWRcbiAgICBncm91cENvbGxhcHNlZDogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkXG4gICAgZ3JvdXBFbmQ6ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZFxuICB9XG59ICYgKFxuICB8IHsgLyoqIHRoZUlEIG9mIGEgZG9tIG5vZGUgdG8gYWRkIG1vbmFjbyB0byAqLyBkb21JRDogc3RyaW5nIH1cbiAgfCB7IC8qKiB0aGVJRCBvZiBhIGRvbSBub2RlIHRvIGFkZCBtb25hY28gdG8gKi8gZWxlbWVudFRvQXBwZW5kOiBIVE1MRWxlbWVudCB9XG4pXG5cbmNvbnN0IGxhbmd1YWdlVHlwZSA9IChjb25maWc6IFBsYXlncm91bmRDb25maWcpID0+IChjb25maWcudXNlSmF2YVNjcmlwdCA/ICdqYXZhc2NyaXB0JyA6ICd0eXBlc2NyaXB0JylcblxuLyoqIERlZmF1bHQgTW9uYWNvIHNldHRpbmdzIGZvciBwbGF5Z3JvdW5kICovXG5jb25zdCBzaGFyZWRFZGl0b3JPcHRpb25zOiBpbXBvcnQoJ21vbmFjby1lZGl0b3InKS5lZGl0b3IuSUVkaXRvck9wdGlvbnMgPSB7XG4gIGF1dG9tYXRpY0xheW91dDogdHJ1ZSxcbiAgc2Nyb2xsQmV5b25kTGFzdExpbmU6IHRydWUsXG4gIHNjcm9sbEJleW9uZExhc3RDb2x1bW46IDMsXG4gIG1pbmltYXA6IHtcbiAgICBlbmFibGVkOiBmYWxzZSxcbiAgfSxcbn1cblxuLyoqIFRoZSBkZWZhdWx0IHNldHRpbmdzIHdoaWNoIHdlIGFwcGx5IGEgcGFydGlhbCBvdmVyICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdFBsYXlncm91bmRTZXR0aW5ncygpIHtcbiAgY29uc3QgY29uZmlnOiBQbGF5Z3JvdW5kQ29uZmlnID0ge1xuICAgIHRleHQ6ICcnLFxuICAgIGRvbUlEOiAnJyxcbiAgICBjb21waWxlck9wdGlvbnM6IHt9LFxuICAgIGFjcXVpcmVUeXBlczogdHJ1ZSxcbiAgICB1c2VKYXZhU2NyaXB0OiBmYWxzZSxcbiAgICBzdXBwb3J0VHdvc2xhc2hDb21waWxlck9wdGlvbnM6IGZhbHNlLFxuICAgIGxvZ2dlcjogY29uc29sZSxcbiAgfVxuICByZXR1cm4gY29uZmlnXG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRGaWxlUGF0aChjb25maWc6IFBsYXlncm91bmRDb25maWcsIGNvbXBpbGVyT3B0aW9uczogQ29tcGlsZXJPcHRpb25zLCBtb25hY286IE1vbmFjbykge1xuICBjb25zdCBpc0pTWCA9IGNvbXBpbGVyT3B0aW9ucy5qc3ggIT09IG1vbmFjby5sYW5ndWFnZXMudHlwZXNjcmlwdC5Kc3hFbWl0Lk5vbmVcbiAgY29uc3QgZmlsZUV4dCA9IGNvbmZpZy51c2VKYXZhU2NyaXB0ID8gJ2pzJyA6ICd0cydcbiAgY29uc3QgZXh0ID0gaXNKU1ggPyBmaWxlRXh0ICsgJ3gnIDogZmlsZUV4dFxuICByZXR1cm4gJ2lucHV0LicgKyBleHRcbn1cblxuLyoqIENyZWF0ZXMgYSBtb25hY28gZmlsZSByZWZlcmVuY2UsIGJhc2ljYWxseSBhIGZhbmN5IHBhdGggKi9cbmZ1bmN0aW9uIGNyZWF0ZUZpbGVVcmkoY29uZmlnOiBQbGF5Z3JvdW5kQ29uZmlnLCBjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucywgbW9uYWNvOiBNb25hY28pIHtcbiAgcmV0dXJuIG1vbmFjby5VcmkuZmlsZShkZWZhdWx0RmlsZVBhdGgoY29uZmlnLCBjb21waWxlck9wdGlvbnMsIG1vbmFjbykpXG59XG5cbi8qKiBDcmVhdGVzIGEgc2FuZGJveCBlZGl0b3IsIGFuZCByZXR1cm5zIGEgc2V0IG9mIHVzZWZ1bCBmdW5jdGlvbnMgYW5kIHRoZSBlZGl0b3IgKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVUeXBlU2NyaXB0U2FuZGJveCA9IChcbiAgcGFydGlhbENvbmZpZzogUGFydGlhbDxQbGF5Z3JvdW5kQ29uZmlnPixcbiAgbW9uYWNvOiBNb25hY28sXG4gIHRzOiB0eXBlb2YgaW1wb3J0KCd0eXBlc2NyaXB0JylcbikgPT4ge1xuICBjb25zdCBjb25maWcgPSB7IC4uLmRlZmF1bHRQbGF5Z3JvdW5kU2V0dGluZ3MoKSwgLi4ucGFydGlhbENvbmZpZyB9XG4gIGlmICghKCdkb21JRCcgaW4gY29uZmlnKSAmJiAhKCdlbGVtZW50VG9BcHBlbmQnIGluIGNvbmZpZykpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgZGlkIG5vdCBwcm92aWRlIGEgZG9tSUQgb3IgZWxlbWVudFRvQXBwZW5kJylcblxuICBjb25zdCBjb21waWxlckRlZmF1bHRzID0gZ2V0RGVmYXVsdFNhbmRib3hDb21waWxlck9wdGlvbnMoY29uZmlnLCBtb25hY28pXG4gIGNvbnN0IGxhbmd1YWdlID0gbGFuZ3VhZ2VUeXBlKGNvbmZpZylcbiAgY29uc3QgZmlsZVBhdGggPSBjcmVhdGVGaWxlVXJpKGNvbmZpZywgY29tcGlsZXJEZWZhdWx0cywgbW9uYWNvKVxuICBjb25zdCBlbGVtZW50ID0gJ2RvbUlEJyBpbiBjb25maWcgPyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChjb25maWcuZG9tSUQpIDogKGNvbmZpZyBhcyBhbnkpLmVsZW1lbnRUb0FwcGVuZFxuXG4gIGNvbnN0IGRlZmF1bHRUZXh0ID0gY29uZmlnLnN1cHByZXNzQXV0b21hdGljYWxseUdldHRpbmdEZWZhdWx0VGV4dFxuICAgID8gY29uZmlnLnRleHRcbiAgICA6IGdldEluaXRpYWxDb2RlKGNvbmZpZy50ZXh0LCBkb2N1bWVudC5sb2NhdGlvbilcblxuICBjb25zdCBtb2RlbCA9IG1vbmFjby5lZGl0b3IuY3JlYXRlTW9kZWwoZGVmYXVsdFRleHQsIGxhbmd1YWdlLCBmaWxlUGF0aClcbiAgbW9uYWNvLmVkaXRvci5kZWZpbmVUaGVtZSgnc2FuZGJveCcsIHNhbmRib3hUaGVtZSlcbiAgbW9uYWNvLmVkaXRvci5kZWZpbmVUaGVtZSgnc2FuZGJveC1kYXJrJywgc2FuZGJveFRoZW1lRGFyaylcbiAgbW9uYWNvLmVkaXRvci5zZXRUaGVtZSgnc2FuZGJveCcpXG5cbiAgY29uc3QgbW9uYWNvU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHsgbW9kZWwgfSwgc2hhcmVkRWRpdG9yT3B0aW9ucywgY29uZmlnLm1vbmFjb1NldHRpbmdzIHx8IHt9KVxuICBjb25zdCBlZGl0b3IgPSBtb25hY28uZWRpdG9yLmNyZWF0ZShlbGVtZW50LCBtb25hY29TZXR0aW5ncylcblxuICBjb25zdCBnZXRXb3JrZXIgPSBjb25maWcudXNlSmF2YVNjcmlwdFxuICAgID8gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LmdldEphdmFTY3JpcHRXb3JrZXJcbiAgICA6IG1vbmFjby5sYW5ndWFnZXMudHlwZXNjcmlwdC5nZXRUeXBlU2NyaXB0V29ya2VyXG5cbiAgY29uc3QgZGVmYXVsdHMgPSBjb25maWcudXNlSmF2YVNjcmlwdFxuICAgID8gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LmphdmFzY3JpcHREZWZhdWx0c1xuICAgIDogbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LnR5cGVzY3JpcHREZWZhdWx0c1xuXG4gIC8vIEluIHRoZSBmdXR1cmUgaXQnZCBiZSBnb29kIHRvIGFkZCBzdXBwb3J0IGZvciBhbiAnYWRkIG1hbnkgZmlsZXMnXG4gIGNvbnN0IGFkZExpYnJhcnlUb1J1bnRpbWUgPSAoY29kZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcpID0+IHtcbiAgICBkZWZhdWx0cy5hZGRFeHRyYUxpYihjb2RlLCBwYXRoKVxuICAgIGNvbmZpZy5sb2dnZXIubG9nKGBbQVRBXSBBZGRpbmcgJHtwYXRofSB0byBydW50aW1lYClcbiAgfVxuXG4gIGNvbnN0IGdldFR3b1NsYXNoQ29tcGxpZXJPcHRpb25zID0gZXh0cmFjdFR3b1NsYXNoQ29tcGxpZXJPcHRpb25zKHRzKVxuXG4gIC8vIFRoZW4gdXBkYXRlIGl0IHdoZW4gdGhlIG1vZGVsIGNoYW5nZXMsIHBlcmhhcHMgdGhpcyBjb3VsZCBiZSBhIGRlYm91bmNlZCBwbHVnaW4gaW5zdGVhZCBpbiB0aGUgZnV0dXJlP1xuICBlZGl0b3Iub25EaWRDaGFuZ2VNb2RlbENvbnRlbnQoKCkgPT4ge1xuICAgIGNvbnN0IGNvZGUgPSBlZGl0b3IuZ2V0TW9kZWwoKSEuZ2V0VmFsdWUoKVxuICAgIGlmIChjb25maWcuc3VwcG9ydFR3b3NsYXNoQ29tcGlsZXJPcHRpb25zKSB7XG4gICAgICBjb25zdCBjb25maWdPcHRzID0gZ2V0VHdvU2xhc2hDb21wbGllck9wdGlvbnMoY29kZSlcbiAgICAgIHVwZGF0ZUNvbXBpbGVyU2V0dGluZ3MoY29uZmlnT3B0cylcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLmFjcXVpcmVUeXBlcykge1xuICAgICAgZGV0ZWN0TmV3SW1wb3J0c1RvQWNxdWlyZVR5cGVGb3IoY29kZSwgYWRkTGlicmFyeVRvUnVudGltZSwgd2luZG93LmZldGNoLmJpbmQod2luZG93KSwgY29uZmlnKVxuICAgIH1cbiAgfSlcblxuICAvLyBHcmFiIHRoZSBjb21waWxlciBmbGFncyB2aWEgdGhlIHF1ZXJ5IHBhcmFtc1xuICBsZXQgY29tcGlsZXJPcHRpb25zOiBDb21waWxlck9wdGlvbnNcbiAgaWYgKCFjb25maWcuc3VwcHJlc3NBdXRvbWF0aWNhbGx5R2V0dGluZ0NvbXBpbGVyRmxhZ3MpIHtcbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGxvY2F0aW9uLnNlYXJjaClcbiAgICBsZXQgcXVlcnlQYXJhbUNvbXBpbGVyT3B0aW9ucyA9IGdldENvbXBpbGVyT3B0aW9uc0Zyb21QYXJhbXMoY29tcGlsZXJEZWZhdWx0cywgcGFyYW1zKVxuICAgIGlmIChPYmplY3Qua2V5cyhxdWVyeVBhcmFtQ29tcGlsZXJPcHRpb25zKS5sZW5ndGgpXG4gICAgICBjb25maWcubG9nZ2VyLmxvZygnW0NvbXBpbGVyXSBGb3VuZCBjb21waWxlciBvcHRpb25zIGluIHF1ZXJ5IHBhcmFtczogJywgcXVlcnlQYXJhbUNvbXBpbGVyT3B0aW9ucylcbiAgICBjb21waWxlck9wdGlvbnMgPSB7IC4uLmNvbXBpbGVyRGVmYXVsdHMsIC4uLnF1ZXJ5UGFyYW1Db21waWxlck9wdGlvbnMgfVxuICB9IGVsc2Uge1xuICAgIGNvbXBpbGVyT3B0aW9ucyA9IGNvbXBpbGVyRGVmYXVsdHNcbiAgfVxuXG4gIGNvbmZpZy5sb2dnZXIubG9nKCdbQ29tcGlsZXJdIFNldCBjb21waWxlciBvcHRpb25zOiAnLCBjb21waWxlck9wdGlvbnMpXG4gIGRlZmF1bHRzLnNldENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMpXG5cbiAgLy8gR3JhYiB0eXBlcyBsYXN0IHNvIHRoYXQgaXQgbG9ncyBpbiBhIGxvZ2ljYWwgd2F5XG4gIGlmIChjb25maWcuYWNxdWlyZVR5cGVzKSB7XG4gICAgLy8gVGFrZSB0aGUgY29kZSBmcm9tIHRoZSBlZGl0b3IgcmlnaHQgYXdheVxuICAgIGNvbnN0IGNvZGUgPSBlZGl0b3IuZ2V0TW9kZWwoKSEuZ2V0VmFsdWUoKVxuICAgIGRldGVjdE5ld0ltcG9ydHNUb0FjcXVpcmVUeXBlRm9yKGNvZGUsIGFkZExpYnJhcnlUb1J1bnRpbWUsIHdpbmRvdy5mZXRjaC5iaW5kKHdpbmRvdyksIGNvbmZpZylcbiAgfVxuXG4gIC8vIFRvIGxldCBjbGllbnRzIHBsdWcgaW50byBjb21waWxlciBzZXR0aW5ncyBjaGFuZ2VzXG4gIGxldCBkaWRVcGRhdGVDb21waWxlclNldHRpbmdzID0gKG9wdHM6IENvbXBpbGVyT3B0aW9ucykgPT4ge31cblxuICBjb25zdCB1cGRhdGVDb21waWxlclNldHRpbmdzID0gKG9wdHM6IENvbXBpbGVyT3B0aW9ucykgPT4ge1xuICAgIGNvbmZpZy5sb2dnZXIubG9nKCdbQ29tcGlsZXJdIFVwZGF0aW5nIGNvbXBpbGVyIG9wdGlvbnM6ICcsIG9wdHMpXG4gICAgY29tcGlsZXJPcHRpb25zID0geyAuLi5vcHRzLCAuLi5jb21waWxlck9wdGlvbnMgfVxuICAgIGRlZmF1bHRzLnNldENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMpXG4gICAgZGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyhjb21waWxlck9wdGlvbnMpXG4gIH1cblxuICBjb25zdCB1cGRhdGVDb21waWxlclNldHRpbmcgPSAoa2V5OiBrZXlvZiBDb21waWxlck9wdGlvbnMsIHZhbHVlOiBhbnkpID0+IHtcbiAgICBjb25maWcubG9nZ2VyLmxvZygnW0NvbXBpbGVyXSBTZXR0aW5nIGNvbXBpbGVyIG9wdGlvbnMgJywga2V5LCAndG8nLCB2YWx1ZSlcbiAgICBjb21waWxlck9wdGlvbnNba2V5XSA9IHZhbHVlXG4gICAgZGVmYXVsdHMuc2V0Q29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucylcbiAgICBkaWRVcGRhdGVDb21waWxlclNldHRpbmdzKGNvbXBpbGVyT3B0aW9ucylcbiAgfVxuXG4gIGNvbnN0IHNldENvbXBpbGVyU2V0dGluZ3MgPSAob3B0czogQ29tcGlsZXJPcHRpb25zKSA9PiB7XG4gICAgY29uZmlnLmxvZ2dlci5sb2coJ1tDb21waWxlcl0gU2V0dGluZyBjb21waWxlciBvcHRpb25zOiAnLCBvcHRzKVxuICAgIGNvbXBpbGVyT3B0aW9ucyA9IG9wdHNcbiAgICBkZWZhdWx0cy5zZXRDb21waWxlck9wdGlvbnMoY29tcGlsZXJPcHRpb25zKVxuICAgIGRpZFVwZGF0ZUNvbXBpbGVyU2V0dGluZ3MoY29tcGlsZXJPcHRpb25zKVxuICB9XG5cbiAgY29uc3QgZ2V0Q29tcGlsZXJPcHRpb25zID0gKCkgPT4ge1xuICAgIHJldHVybiBjb21waWxlck9wdGlvbnNcbiAgfVxuXG4gIGNvbnN0IHNldERpZFVwZGF0ZUNvbXBpbGVyU2V0dGluZ3MgPSAoZnVuYzogKG9wdHM6IENvbXBpbGVyT3B0aW9ucykgPT4gdm9pZCkgPT4ge1xuICAgIGRpZFVwZGF0ZUNvbXBpbGVyU2V0dGluZ3MgPSBmdW5jXG4gIH1cblxuICAvKiogR2V0cyB0aGUgcmVzdWx0cyBvZiBjb21waWxpbmcgeW91ciBlZGl0b3IncyBjb2RlICovXG4gIGNvbnN0IGdldEVtaXRSZXN1bHQgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgbW9kZWwgPSBlZGl0b3IuZ2V0TW9kZWwoKSFcblxuICAgIGNvbnN0IGNsaWVudCA9IGF3YWl0IGdldFdvcmtlclByb2Nlc3MoKVxuICAgIHJldHVybiBhd2FpdCBjbGllbnQuZ2V0RW1pdE91dHB1dChtb2RlbC51cmkudG9TdHJpbmcoKSlcbiAgfVxuXG4gIC8qKiBHZXRzIHRoZSBKUyAgb2YgY29tcGlsaW5nIHlvdXIgZWRpdG9yJ3MgY29kZSAqL1xuICBjb25zdCBnZXRSdW5uYWJsZUpTID0gYXN5bmMgKCkgPT4ge1xuICAgIGlmIChjb25maWcudXNlSmF2YVNjcmlwdCkge1xuICAgICAgcmV0dXJuIGdldFRleHQoKVxuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdldEVtaXRSZXN1bHQoKVxuICAgIGNvbnN0IGZpcnN0SlMgPSByZXN1bHQub3V0cHV0RmlsZXMuZmluZCgobzogYW55KSA9PiBvLm5hbWUuZW5kc1dpdGgoJy5qcycpIHx8IG8ubmFtZS5lbmRzV2l0aCgnLmpzeCcpKVxuICAgIHJldHVybiAoZmlyc3RKUyAmJiBmaXJzdEpTLnRleHQpIHx8ICcnXG4gIH1cblxuICAvKiogR2V0cyB0aGUgRFRTIGZvciB0aGUgSlMvVFMgIG9mIGNvbXBpbGluZyB5b3VyIGVkaXRvcidzIGNvZGUgKi9cbiAgY29uc3QgZ2V0RFRTRm9yQ29kZSA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBnZXRFbWl0UmVzdWx0KClcbiAgICByZXR1cm4gcmVzdWx0Lm91dHB1dEZpbGVzLmZpbmQoKG86IGFueSkgPT4gby5uYW1lLmVuZHNXaXRoKCcuZC50cycpKSEudGV4dFxuICB9XG5cbiAgY29uc3QgZ2V0V29ya2VyUHJvY2VzcyA9IGFzeW5jICgpOiBQcm9taXNlPFR5cGVTY3JpcHRXb3JrZXI+ID0+IHtcbiAgICBjb25zdCB3b3JrZXIgPSBhd2FpdCBnZXRXb3JrZXIoKVxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICByZXR1cm4gYXdhaXQgd29ya2VyKG1vZGVsLnVyaSlcbiAgfVxuXG4gIGNvbnN0IGdldERvbU5vZGUgPSAoKSA9PiBlZGl0b3IuZ2V0RG9tTm9kZSgpIVxuICBjb25zdCBnZXRNb2RlbCA9ICgpID0+IGVkaXRvci5nZXRNb2RlbCgpIVxuICBjb25zdCBnZXRUZXh0ID0gKCkgPT4gZ2V0TW9kZWwoKS5nZXRWYWx1ZSgpXG4gIGNvbnN0IHNldFRleHQgPSAodGV4dDogc3RyaW5nKSA9PiBnZXRNb2RlbCgpLnNldFZhbHVlKHRleHQpXG5cbiAgLyoqXG4gICAqIFdhcm5pbmc6IFJ1bnMgb24gdGhlIG1haW4gdGhyZWFkXG4gICAqL1xuICBjb25zdCBjcmVhdGVUU1Byb2dyYW0gPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgZnNNYXAgPSBhd2FpdCB0c3Zmcy5jcmVhdGVEZWZhdWx0TWFwRnJvbUNETihjb21waWxlck9wdGlvbnMsIHRzLnZlcnNpb24sIHRydWUsIHRzLCBsenN0cmluZylcbiAgICBmc01hcC5zZXQoZmlsZVBhdGgucGF0aCwgZ2V0VGV4dCgpKVxuXG4gICAgY29uc3Qgc3lzdGVtID0gdHN2ZnMuY3JlYXRlU3lzdGVtKGZzTWFwKVxuICAgIGNvbnN0IGhvc3QgPSB0c3Zmcy5jcmVhdGVWaXJ0dWFsQ29tcGlsZXJIb3N0KHN5c3RlbSwgY29tcGlsZXJPcHRpb25zLCB0cylcblxuICAgIGNvbnN0IHByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHtcbiAgICAgIHJvb3ROYW1lczogWy4uLmZzTWFwLmtleXMoKV0sXG4gICAgICBvcHRpb25zOiBjb21waWxlck9wdGlvbnMsXG4gICAgICBob3N0OiBob3N0LmNvbXBpbGVySG9zdCxcbiAgICB9KVxuXG4gICAgcmV0dXJuIHByb2dyYW1cbiAgfVxuXG4gIGNvbnN0IGdldEFTVCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBwcm9ncmFtID0gYXdhaXQgY3JlYXRlVFNQcm9ncmFtKClcbiAgICBwcm9ncmFtLmVtaXQoKVxuICAgIHJldHVybiBwcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZVBhdGgucGF0aCkhXG4gIH1cblxuICAvLyBQYXNzIGFsb25nIHRoZSBzdXBwb3J0ZWQgcmVsZWFzZXMgZm9yIHRoZSBwbGF5Z3JvdW5kXG4gIGNvbnN0IHN1cHBvcnRlZFZlcnNpb25zID0gc3VwcG9ydGVkUmVsZWFzZXNcblxuICByZXR1cm4ge1xuICAgIC8qKiBUaGUgc2FtZSBjb25maWcgeW91IHBhc3NlZCBpbiAqL1xuICAgIGNvbmZpZyxcbiAgICAvKiogQSBsaXN0IG9mIFR5cGVTY3JpcHQgdmVyc2lvbnMgeW91IGNhbiB1c2Ugd2l0aCB0aGUgVHlwZVNjcmlwdCBzYW5kYm94ICovXG4gICAgc3VwcG9ydGVkVmVyc2lvbnMsXG4gICAgLyoqIFRoZSBtb25hY28gZWRpdG9yIGluc3RhbmNlICovXG4gICAgZWRpdG9yLFxuICAgIC8qKiBFaXRoZXIgXCJ0eXBlc2NyaXB0XCIgb3IgXCJqYXZhc2NyaXB0XCIgZGVwZW5kaW5nIG9uIHlvdXIgY29uZmlnICovXG4gICAgbGFuZ3VhZ2UsXG4gICAgLyoqIFRoZSBvdXRlciBtb25hY28gbW9kdWxlLCB0aGUgcmVzdWx0IG9mIHJlcXVpcmUoXCJtb25hY28tZWRpdG9yXCIpICAqL1xuICAgIG1vbmFjbyxcbiAgICAvKiogR2V0cyBhIG1vbmFjby10eXBlc2NyaXB0IHdvcmtlciwgdGhpcyB3aWxsIGdpdmUgeW91IGFjY2VzcyB0byBhIGxhbmd1YWdlIHNlcnZlci4gTm90ZTogcHJlZmVyIHRoaXMgZm9yIGxhbmd1YWdlIHNlcnZlciB3b3JrIGJlY2F1c2UgaXQgaGFwcGVucyBvbiBhIHdlYndvcmtlciAuICovXG4gICAgZ2V0V29ya2VyUHJvY2VzcyxcbiAgICAvKiogQSBjb3B5IG9mIHJlcXVpcmUoXCJ0eXBlc2NyaXB0LXZmc1wiKSB0aGlzIGNhbiBiZSB1c2VkIHRvIHF1aWNrbHkgc2V0IHVwIGFuIGluLW1lbW9yeSBjb21waWxlciBydW5zIGZvciBBU1RzLCBvciB0byBnZXQgY29tcGxleCBsYW5ndWFnZSBzZXJ2ZXIgcmVzdWx0cyAoYW55dGhpbmcgYWJvdmUgaGFzIHRvIGJlIHNlcmlhbGl6ZWQgd2hlbiBwYXNzZWQpKi9cbiAgICB0c3ZmcyxcbiAgICAvKiogR2V0IGFsbCB0aGUgZGlmZmVyZW50IGVtaXR0ZWQgZmlsZXMgYWZ0ZXIgVHlwZVNjcmlwdCBpcyBydW4gKi9cbiAgICBnZXRFbWl0UmVzdWx0LFxuICAgIC8qKiBHZXRzIGp1c3QgdGhlIEphdmFTY3JpcHQgZm9yIHlvdXIgc2FuZGJveCwgd2lsbCB0cmFuc3BpbGUgaWYgaW4gVFMgb25seSAqL1xuICAgIGdldFJ1bm5hYmxlSlMsXG4gICAgLyoqIEdldHMgdGhlIERUUyBvdXRwdXQgb2YgdGhlIG1haW4gY29kZSBpbiB0aGUgZWRpdG9yICovXG4gICAgZ2V0RFRTRm9yQ29kZSxcbiAgICAvKiogVGhlIG1vbmFjby1lZGl0b3IgZG9tIG5vZGUsIHVzZWQgZm9yIHNob3dpbmcvaGlkaW5nIHRoZSBlZGl0b3IgKi9cbiAgICBnZXREb21Ob2RlLFxuICAgIC8qKiBUaGUgbW9kZWwgaXMgYW4gb2JqZWN0IHdoaWNoIG1vbmFjbyB1c2VzIHRvIGtlZXAgdHJhY2sgb2YgdGV4dCBpbiB0aGUgZWRpdG9yLiBVc2UgdGhpcyB0byBkaXJlY3RseSBtb2RpZnkgdGhlIHRleHQgaW4gdGhlIGVkaXRvciAqL1xuICAgIGdldE1vZGVsLFxuICAgIC8qKiBHZXRzIHRoZSB0ZXh0IG9mIHRoZSBtYWluIG1vZGVsLCB3aGljaCBpcyB0aGUgdGV4dCBpbiB0aGUgZWRpdG9yICovXG4gICAgZ2V0VGV4dCxcbiAgICAvKiogU2hvcnRjdXQgZm9yIHNldHRpbmcgdGhlIG1vZGVsJ3MgdGV4dCBjb250ZW50IHdoaWNoIHdvdWxkIHVwZGF0ZSB0aGUgZWRpdG9yICovXG4gICAgc2V0VGV4dCxcbiAgICAvKiogR2V0cyB0aGUgQVNUIG9mIHRoZSBjdXJyZW50IHRleHQgaW4gbW9uYWNvIC0gdXNlcyBgY3JlYXRlVFNQcm9ncmFtYCwgc28gdGhlIHBlcmZvcm1hbmNlIGNhdmVhdCBhcHBsaWVzIHRoZXJlIHRvbyAqL1xuICAgIGdldEFTVCxcbiAgICAvKiogVGhlIG1vZHVsZSB5b3UgZ2V0IGZyb20gcmVxdWlyZShcInR5cGVzY3JpcHRcIikgKi9cbiAgICB0cyxcbiAgICAvKiogQ3JlYXRlIGEgbmV3IFByb2dyYW0sIGEgVHlwZVNjcmlwdCBkYXRhIG1vZGVsIHdoaWNoIHJlcHJlc2VudHMgdGhlIGVudGlyZSBwcm9qZWN0LlxuICAgICAqXG4gICAgICogVGhlIGZpcnN0IHRpbWUgdGhpcyBpcyBjYWxsZWQgaXQgaGFzIHRvIGRvd25sb2FkIGFsbCB0aGUgRFRTIGZpbGVzIHdoaWNoIGlzIG5lZWRlZCBmb3IgYW4gZXhhY3QgY29tcGlsZXIgcnVuLiBXaGljaFxuICAgICAqIGF0IG1heCBpcyBhYm91dCAxLjVNQiAtIGFmdGVyIHRoYXQgc3Vic2VxdWVudCBkb3dubG9hZHMgb2YgZHRzIGxpYiBmaWxlcyBjb21lIGZyb20gbG9jYWxTdG9yYWdlLlxuICAgICAqXG4gICAgICogVHJ5IHRvIHVzZSB0aGlzIHNwYXJpbmdseSBhcyBpdCBjYW4gYmUgY29tcHV0YXRpb25hbGx5IGV4cGVuc2l2ZSwgYXQgdGhlIG1pbmltdW0geW91IHNob3VsZCBiZSB1c2luZyB0aGUgZGVib3VuY2VkIHNldHVwLlxuICAgICAqXG4gICAgICogVE9ETzogSXQgd291bGQgYmUgZ29vZCB0byBjcmVhdGUgYW4gZWFzeSB3YXkgdG8gaGF2ZSBhIHNpbmdsZSBwcm9ncmFtIGluc3RhbmNlIHdoaWNoIGlzIHVwZGF0ZWQgZm9yIHlvdVxuICAgICAqIHdoZW4gdGhlIG1vbmFjbyBtb2RlbCBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGNyZWF0ZVRTUHJvZ3JhbSxcbiAgICAvKiogVGhlIFNhbmRib3gncyBkZWZhdWx0IGNvbXBpbGVyIG9wdGlvbnMgICovXG4gICAgY29tcGlsZXJEZWZhdWx0cyxcbiAgICAvKiogVGhlIFNhbmRib3gncyBjdXJyZW50IGNvbXBpbGVyIG9wdGlvbnMgKi9cbiAgICBnZXRDb21waWxlck9wdGlvbnMsXG4gICAgLyoqIFJlcGxhY2UgdGhlIFNhbmRib3gncyBjb21waWxlciBvcHRpb25zICovXG4gICAgc2V0Q29tcGlsZXJTZXR0aW5ncyxcbiAgICAvKiogT3ZlcndyaXRlIHRoZSBTYW5kYm94J3MgY29tcGlsZXIgb3B0aW9ucyAqL1xuICAgIHVwZGF0ZUNvbXBpbGVyU2V0dGluZyxcbiAgICAvKiogVXBkYXRlIGEgc2luZ2xlIGNvbXBpbGVyIG9wdGlvbiBpbiB0aGUgU0FuZGJveCAqL1xuICAgIHVwZGF0ZUNvbXBpbGVyU2V0dGluZ3MsXG4gICAgLyoqIEEgd2F5IHRvIGdldCBjYWxsYmFja3Mgd2hlbiBjb21waWxlciBzZXR0aW5ncyBoYXZlIGNoYW5nZWQgKi9cbiAgICBzZXREaWRVcGRhdGVDb21waWxlclNldHRpbmdzLFxuICAgIC8qKiBBIGNvcHkgb2YgbHpzdHJpbmcsIHdoaWNoIGlzIHVzZWQgdG8gYXJjaGl2ZS91bmFyY2hpdmUgY29kZSAqL1xuICAgIGx6c3RyaW5nLFxuICAgIC8qKiBSZXR1cm5zIGNvbXBpbGVyIG9wdGlvbnMgZm91bmQgaW4gdGhlIHBhcmFtcyBvZiB0aGUgY3VycmVudCBwYWdlICovXG4gICAgZ2V0VVJMUXVlcnlXaXRoQ29tcGlsZXJPcHRpb25zLFxuICAgIC8qKiBSZXR1cm5zIGNvbXBpbGVyIG9wdGlvbnMgaW4gdGhlIHNvdXJjZSBjb2RlIHVzaW5nIHR3b3NsYXNoIG5vdGF0aW9uICovXG4gICAgZ2V0VHdvU2xhc2hDb21wbGllck9wdGlvbnMsXG4gICAgLyoqIEdldHMgdG8gdGhlIGN1cnJlbnQgbW9uYWNvLWxhbmd1YWdlLCB0aGlzIGlzIGhvdyB5b3UgdGFsayB0byB0aGUgYmFja2dyb3VuZCB3ZWJ3b3JrZXJzICovXG4gICAgbGFuZ3VhZ2VTZXJ2aWNlRGVmYXVsdHM6IGRlZmF1bHRzLFxuICB9XG59XG5cbmV4cG9ydCB0eXBlIFNhbmRib3ggPSBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVUeXBlU2NyaXB0U2FuZGJveD5cbiJdfQ==