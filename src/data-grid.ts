import {css, html, LitElement} from 'lit'
import {customElement, property, state} from 'lit/decorators.js'
import "./data-grid-column.ts";
import "./data-grid-row.ts";
import "./data-grid-cell.ts";
import {Column, Row} from "./types.ts";
import {provide} from "@lit/context";
import {
    editableContext,
    filterableContext,
    hideableContext,
    resizeContext,
    sortableContext
} from "./context.ts";
import {pixelsToPercentOfWidth} from "./utils/shared.ts";
import {watch} from "./utils/watch.ts";
import Sortable from "sortablejs";
/**
 * Data Grid
 *
 * @slot - This element has a slot
 */
@customElement('data-grid')
export class DataGrid extends LitElement {
    //#region Properties
    /**
     * The columns of the data grid
     */
    @property({type: Array}) columns: Column[] = [];
    /**
     * The rows of the data grid
     */
    @property({type: Array}) rows: Row[] = [];
    //#endregion Properties
    //#region Options
    /**
     * Whether the grid is editable
     */
    @provide({context: editableContext})
    @property({type: Boolean}) editable? = false;
    /**
     * Whether the grid is filterable
     */
    @provide({context: filterableContext})
    @property({type: Boolean}) filterable? = false;
    /**
     * Whether the grid is sortable
     */
    @provide({context: sortableContext})
    @property({type: Boolean}) sortable? = false;
    /**
     * Whether the grid is hideable
     */
    @provide({context: hideableContext})
    @property({type: Boolean}) hideable? = true;
    /**
     * Whether the grid is resizable
     */
    @provide({context: resizeContext})
    @property({type: Boolean}) resizable? = true;

    //#endregion Options
    //#region States
    @state() public gridTemplateColumns: number[] = [];
    //#endregion States
    //#region Lifecycle
    override disconnectedCallback() {
        super.disconnectedCallback();
        if(this.sortableColumns) this.sortableColumns.destroy();
        if(this.sortableRows) this.sortableRows.destroy();
    }

    //#endregion Lifecycle
    //#region Cell Resizing
    @watch('columns')
    handleColumnsChange() {
        if(this.columns && this.gridTemplateColumns.length !== this.columns.length) this.initializeCellWidths();
    }
    @watch('gridTemplateColumns')
    async handleGridTemplateColumnsChange() {
        this.style.setProperty('--grid-template-columns', this.gridTemplateColumns.map(v => `${v}%`).join(' '));
    }
    private async initializeCellWidths() {
        this.gridTemplateColumns = this.columns.map((c, index) => {
            const existingWidth = this.gridTemplateColumns.length > 1 ? this.gridTemplateColumns[index] : undefined;
            return existingWidth ? existingWidth : c?.minWidth ? pixelsToPercentOfWidth(c?.minWidth, this.getBoundingClientRect().width) : 100 / this.columns.length - 1;
        });
        await this.handleGridTemplateColumnsChange();
    }
    //#endregion Cell Resizing
    //#region Cell Reordering
    private sortableColumns?: Sortable;
    private sortableRows?: Sortable;
    private colBefore?: ChildNode | null;
    private rowBefore?: ChildNode | null;
    @watch('sortable')
    async handleSortableColumnChange() {
        await this.updateComplete;
        if(!this.sortable) {
            if(this.sortableColumns) this.sortableColumns.destroy();
            if(this.sortableRows) this.sortableRows.destroy();
        } else {
                this.sortableColumns = new Sortable(this.querySelector('.head data-grid-row') as HTMLElement, {
                    handle: '[slot="reorder-handle"]', // handle's class
                    animation: 150,
                    draggable: 'data-grid-column',
                    direction: 'horizontal',
                    easing: 'cubic-bezier(1, 0, 0, 1)',
                    // Classes
                    ghostClass: 'ghost',
                    chosenClass: 'chosen',
                    dragClass: 'dragging',
                    swapClass: 'highlighted',
                    onStart: (e: Sortable.SortableEvent) => {
                        this.colBefore = e.item.previousSibling;
                    },
                    onEnd: (e: Sortable.SortableEvent) => {
                        const to = e.newIndex;
                        const from = e.oldIndex;
                        if(this.colBefore) this.colBefore.after(e.item);
                        this.columns.splice(to as number, 0, this.columns.splice(from as number, 1)[0]);
                        this.colBefore = undefined;
                        this.requestUpdate();
                    }
                });
                this.sortableRows = new Sortable(this.querySelector('.body') as HTMLElement, {
                    animation: 150,
                    draggable: 'data-grid-row',
                    direction: 'vertical',
                    easing: 'cubic-bezier(1, 0, 0, 1)',
                    dataIdAttr: 'data-index',
                    // Classes
                    ghostClass: 'ghost',
                    chosenClass: 'chosen',
                    dragClass: 'dragging',
                    swapClass: 'highlighted',
                    onStart: (e: Sortable.SortableEvent) => {
                        this.rowBefore = e.item.previousSibling;
                    },
                    onEnd: (e: Sortable.SortableEvent) => {
                        if(this.rowBefore) this.rowBefore.after(e.item);
                        this.rows.splice(e.newIndex as number, 0, this.rows.splice(e.oldIndex as number, 1)[0]);
                        this.requestUpdate();
                        this.rowBefore = undefined;
                    }
                });
            }
    }
    //#endregion Cell Reordering
    //#region Cell Rendering
    private renderCell(row: Row, column: Column, index: number) {
        if(column.render) {
            // This method OR set main data-table instance to light-dom and use a internal wrapper for styling + shadowDOM functionality
            const children = column.render(row[column.field], index);
            return children;
            // render(html`<div slot="${column.field}-${index}">${children}</div>`, this);
            // return html`<slot name="${column.field}-${index}"></slot>`
        } else {
            return row[column.field];
        }
    }
    //#endregion Cell Rendering
    render() {
        return html`
            <div class="grid">
                <div class="head">
                    <data-grid-row>
                        ${this.columns.map((column, idx) => html`
                            <data-grid-column .index=${idx}>
                                <div slot="reorder-handle"></div>
                                ${column?.label}
                            </data-grid-column>
                        `)}
                    </data-grid-row>
                </div>
                <div class="body">
                ${this.rows.map((row, idx) => html`
                    <data-grid-row>
                        ${this.columns.map((column) => html`
                            <data-grid-cell>
                                ${this.renderCell(row, column, idx)}
                            </data-grid-cell>
                        `)}
                    </data-grid-row>
                `)}
                </div>
            </div>
        `
    }

    static styles = css`
        :host {
            --grid-template-columns: auto;
        }
        .grid {
            display: grid;
            grid-template-columns: var(--grid-template-columns);
        }

        .head, .body {
            display: grid;
            box-sizing: border-box;
            grid-template-columns: subgrid;
            grid-column: 1/-1;
        }
        
        [slot="reorder-handle"] {
            cursor: grab;
            display: inline-block;
            width: 16px;
            height: 16px;
            background-color: lightgray;
            margin-right: 4px;
        }
    `

    override createRenderRoot() {
        /**
         * Rendering this in Light DOM allows for styling to bleed through
         * from the users stylesheets
         */
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(DataGrid.styles.toString());
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
        return this
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'data-grid': DataGrid
    }
}
