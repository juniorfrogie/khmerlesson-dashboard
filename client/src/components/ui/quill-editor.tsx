import React, { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
// import './custom-editor.css';

// interface EditorProps {
//   value?: string;
//   onChange?: (content: string) => void;
//   readOnly?: boolean;
//   placeholder?: string;
// }

// const Editor = forwardRef<Quill, EditorProps>(({ value = '', onChange, readOnly = false, placeholder = 'Write something...' }, ref) => {
//   const editorRef = useRef<HTMLDivElement>(null);
//   const quillRef = useRef<Quill | null>(null);
//   const [editorId] = useState(`quill-editor-${Math.random().toString(36).substring(2, 9)}`);

//   useEffect(() => {
//     const destroyQuill = () => {
//       if (quillRef.current) {
//         quillRef.current = null;
//       }
//       document.querySelectorAll('.ql-toolbar').forEach(toolbar => toolbar.remove());
//       if (editorRef.current) {
//         editorRef.current.innerHTML = '';
//         const editorElement = document.createElement('div');
//         editorElement.id = editorId;
//         editorRef.current.appendChild(editorElement);
//         return editorElement;
//       }
//       return null;
//     };

//     const editorElement = destroyQuill();
//     if (!editorElement) return;

//     const modules = {
//       toolbar: [
//         [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
//         ['bold', 'italic', 'underline', 'strike'],
//       ]
//     };

//     const quill = new Quill(editorElement, {
//       theme: 'snow',
//       modules,
//       placeholder,
//       readOnly
//     });
//     quillRef.current = quill;
    
//     quill.on('text-change', () => {
//       if (onChange) {
//         onChange(quill.root.innerHTML);
//       }
//     });

//     return () => {
//       destroyQuill();
//     };
//   }, [placeholder, readOnly, editorId, onChange]);

//   return <div ref={editorRef} className="custom-editor-container"></div>;
// });

// export default Editor;


interface EditorProps {
  ref: any;
  defaultValue?: any;
  onChange: (content: any) => void;
  onHtml: (content: string | null) => void;
  onOps: (content: any) => void;
  onTextChange?: any;
  onSelectionChange: any;
  readOnly?: boolean;
  placeholder: string;
}

// Editor is an uncontrolled React component
const Editor = forwardRef<Quill, EditorProps>(
  ({ readOnly, defaultValue, onChange, onHtml, onOps, onTextChange, onSelectionChange, placeholder }, ref: any) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const defaultValueRef = useRef(defaultValue);
    const onTextChangeRef = useRef(onTextChange);
    const onSelectionChangeRef = useRef(onSelectionChange);

    useLayoutEffect(() => {
      onTextChangeRef.current = onTextChange;
      onSelectionChangeRef.current = onSelectionChange;
    });

    useEffect(() => {
      ref.current?.enable(!readOnly);
    }, [ref, readOnly]);

    useEffect(() => {
      const container = containerRef.current;
      if(!container) return
      const editorContainer = container.appendChild(
        container.ownerDocument.createElement('div'),
      );

      const modules = {
        toolbar: [
          ['bold', 'italic', 'underline'],
          // [{ list: 'ordered' }, { list: 'bullet' }]
        ]
      };
      const quill = new Quill(editorContainer, {
        theme: 'snow',
        placeholder: placeholder,
        readOnly: readOnly,
        modules: modules
      });

      ref.current = quill;

      if (defaultValueRef.current) {
        quill.setContents(defaultValueRef.current);
      }

      quill.on(Quill.events.TEXT_CHANGE, (...args) => {
        onTextChangeRef.current?.(...args);
        let textHasFormatted = quill.editor.getDelta().ops.length > 1
        //
        const ops = JSON.stringify(args[1].ops)

        const jsonData = JSON.parse(ops)

        onOps(textHasFormatted ? quill.editor.getDelta().ops : null)
        let content = ""
        for(let e of jsonData){
          onChange(content += e["insert"])
        }
        //
        onHtml(textHasFormatted ? quill.root.innerHTML : null)
      });

      quill.on(Quill.events.SELECTION_CHANGE, (...args) => {
        onSelectionChangeRef.current?.(...args);
      });

      return () => {
        ref.current = null;
        container.innerHTML = '';
      };
    }, [ref]);

    return <div ref={containerRef}></div>;
  },
);

Editor.displayName = 'Editor';

export default Editor;