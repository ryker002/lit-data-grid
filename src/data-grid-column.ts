import {html, LitElement, nothing} from 'lit'
import {customElement, property, state} from 'lit/decorators.js'
import {cellBaseStyles, headerBaseStyles, headerResizerStyles} from "./styles.ts";
import {Column, ColumnAlignment} from "./types.ts";
import {consume} from "@lit/context";
import {
    dataGridContext,
    editableContext,
    filterableContext,
    hideableContext, reorderContext,
    resizeContext,
    sortableContext
} from "./context.ts";
import {DataGrid} from "./data-grid.ts";
import {pixelsToPercentOfWidth} from "./utils/shared.ts";
import {watch} from "./utils/watch.ts";

/**
 * Data Grid Column
 *
 */
@customElement('data-grid-column')
export class DataGridColumn extends LitElement {
    //#region Properties
    /**
     * The index of the column
     */
    @property({type: Number}) index!: number;
    /**
     * The alignment of the column
     */
    @property({type: String}) align: ColumnAlignment = 'start';
    /**
     * The description of the column and the data it contains
     */
    @property({type: String}) description?: Column['description'];
    /**
     * The minimum width the column can be resized too
     */
    @property({type: Number}) minWidth?: Column['minWidth'];
    /**
     * The maximum width the column can be resized too
     */
    @property({type: Number}) maxWidth?: Column['maxWidth'];
    @property({type: Object}) sort?: {
        direction: 'asc' | 'desc',
        index: number
    };
    //#endregion Properties
    //#region Options
    /**
     * Whether the column is editable
     */
    @consume({context: editableContext})
    @property({type: Boolean}) editable?: Column['editable'] = false;
    /**
     * Whether the column is filterable
     */
    @consume({context: filterableContext})
    @property({type: Boolean}) filterable?: Column['filterable'] = false;
    /**
     * Whether the column is sortable
     */
    @consume({context: sortableContext})
    @property({type: Boolean}) sortable?: Column['sortable'] = false;
    /**
     * Whether the column is hideable
     */
    @consume({context: hideableContext})
    @property({type: Boolean}) hideable?: Column['hideable'] = true;
    /**
     * Whether the column is resizable
     */
    @consume({context: resizeContext})
    @property({type: Boolean}) resizable?: Column['resizable'] = true;
    /**
     * Whether the column is reorderable
     */
    @consume({context: reorderContext})
    @property({type: Boolean}) reorderable?: boolean = true;
    //#endregion Options
    //#region State
    @state() _resizing = false;
    @state() width!: number;
    @consume({context: dataGridContext}) grid!: DataGrid;
    private get gridWidth() {
        if(this.grid) {
            return this.grid.getBoundingClientRect().width;
        } else {
            console.warn('DataGridColumn must be a child of DataGrid');
            return 0;
        }
    }

    //#endregion State
    //#region Lifecycle
    override connectedCallback() {
        super.connectedCallback();
        this.addEventListener('pointerdown', (event: PointerEvent) => {
            if(this.sortable) {
                // this.sort = {
                //     direction: this.sort && this.sort.direction === 'desc' ? 'asc' : this.sort.direction === 'asc' ? ,
                //     index: this.index
                // }
            }
        }
    }

    override firstUpdated() {
            if(this.grid) this.width = this.grid.gridTemplateColumns[this.index];
    }
    //#endregion Lifecycle
    //#region Watchers
    @watch('width')
    handleWidthChange() {
        this.dataset.width = `${this.width}%`;
        if(this.grid) {
            const gridTemplateColumns = [...this.grid.gridTemplateColumns];
            gridTemplateColumns[this.index] = this.width;
            this.grid.gridTemplateColumns = gridTemplateColumns;
        }
    }
    //#endregion Watchers

    render() {
        return html`
                ${this.reorderable ? html`<slot name="reorder-handle"></slot>` : nothing}
                <slot></slot>
                ${this.sortable && this.sort ? html`
                    <div class="sort-indicator" data-sort-direction="${this.sort.direction}"></div>
                ` : ''}
                ${this.resizable ? html`
                    <div class="resize-handle" @pointerdown="${this.onResizePointerDown}"
                    ></div>` : ''}
        `
    }

    private onResizePointerDown = (event: PointerEvent) => {
        const startX = event.clientX;
        const startWidth = this?.offsetWidth || 0;
            const onPointerMove = (evt: PointerEvent) => {
                evt.preventDefault()
                if (this._resizing) {
                    this.width = pixelsToPercentOfWidth(Math.max(this.minWidth || 60, startWidth + evt.clientX - startX), this.gridWidth)
                }
            }
            const onPointerUp = () => {
                    this._resizing = false;
                    document.removeEventListener('pointermove', onPointerMove)
                    document.removeEventListener('pointerup', onPointerUp);
            }
            this._resizing = true;
            document.addEventListener('pointermove', onPointerMove)
            document.addEventListener('pointerup', onPointerUp);
    }

    static styles = [
        cellBaseStyles,
        headerBaseStyles,
        headerResizerStyles
    ]
}

declare global {
    interface HTMLElementTagNameMap {
        'data-grid-column': DataGridColumn
    }
}
