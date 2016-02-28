import * as mio from '../default';

/**
 * Represents a menu component.
 */
export class MenuComponent extends mio.StatelessComponent<{menu: mio.IMenuState, series: mio.IOption<mio.ILibrarySeries[]>}> {
  /**
   * Renders the component.
   */
  public render(): JSX.Element {
    return (
      <div className="menu">
        {/* TODO: Search/Add. */}
        <mio.MenuFilterComponent menu={this.props.menu} />
        {/* TODO: Ordering. */}
        {(() => {
          if (this.props.menu.type === mio.MenuType.Default) {
            return <mio.MenuSeriesComponent series={this.props.series} />;
          } else {
            return null;
          }
        })()}
      </div>
    );
  }
}
