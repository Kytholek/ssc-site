/**
 * FlowNode — ReactFlow adapter for blueprint decode flows.
 * Label sits under the seal so it never collides with MASTER / icon / number.
 */
import FlowProgressNode from './FlowProgressNode'

export { FLOW_NODE_SIZE, FLOW_NODE_HALF } from './flowNodeConstants'

function FlowNode({ data }) {
  return (
    <div className={`flow-node-seal${data.isSelected ? ' flow-node-seal--selected' : ''}`}>
      <FlowProgressNode
        color={data.color}
        icon={data.icon}
        displayNum={data.displayNum}
        isSelected={data.isSelected}
        isMaster={data.isMaster}
        showProgressArc={false}
        showPips={false}
        showBadge={false}
        onClick={data.onClick}
        withHandles
      />
      {data.label && (
        <div className="flow-node-seal-caption">{data.label}</div>
      )}
    </div>
  )
}

export default FlowNode
export const flowNodeTypes = { flowNode: FlowNode }
