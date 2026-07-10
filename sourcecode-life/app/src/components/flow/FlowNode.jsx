/**
 * FlowNode — ReactFlow adapter for blueprint decode flows.
 */
import FlowProgressNode from './FlowProgressNode'

export { FLOW_NODE_SIZE, FLOW_NODE_HALF } from './flowNodeConstants'

function FlowNode({ data }) {
  return (
    <FlowProgressNode
      color={data.color}
      icon={data.icon}
      displayNum={data.displayNum}
      subtitle={data.label}
      isSelected={data.isSelected}
      isMaster={data.isMaster}
      showProgressArc={false}
      showPips={false}
      showBadge={false}
      onClick={data.onClick}
      withHandles
    />
  )
}

export default FlowNode
export const flowNodeTypes = { flowNode: FlowNode }
