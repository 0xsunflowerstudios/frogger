import { Button } from "components/ui/Button";
import { CloseButtonPanel } from "features/game/components/CloseablePanel";
import { NPC_WEARABLES } from "lib/npcs";
import React, { useContext, useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import PubSub from "pubsub-js";
import { claimArcadeToken } from "./actions/claimArcadeToken";
import { PortalContext } from "./lib/PortalProvider";
import { useActor } from "@xstate/react";

export const FroggerModals: React.FC = () => {
  const { portalService } = useContext(PortalContext);
  const [portalState] = useActor(portalService);

  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);

  useEffect(() => {
    const token = PubSub.subscribe("GAME_OVER", () => {
      console.log("React received event:");
      setShowGameOverModal(true);
    });

    const win = PubSub.subscribe("WIN", () => {
      console.log("React received event:");
      setShowWinModal(true);
    });

    return () => {
      PubSub.unsubscribe(token);
      PubSub.unsubscribe(win);
    };
  }, []);

  const keepPlaying = () => {
    setShowGameOverModal(false);
  };

  return (
    <>
      <Modal
        show={showGameOverModal}
        centered
        onHide={() => setShowGameOverModal(false)}
      >
        <CloseButtonPanel bumpkinParts={NPC_WEARABLES.adam}>
          <p className="text-sm">GAME OVER!</p>
          <Button onClick={keepPlaying}>Continue</Button>
        </CloseButtonPanel>
      </Modal>
      <Modal show={showWinModal} centered onHide={() => setShowWinModal(false)}>
        <CloseButtonPanel bumpkinParts={NPC_WEARABLES.adam}>
          <p className="text-sm">WIN</p>
          <Button
            onClick={() => {
              claimArcadeToken({
                token: portalState.context.jwt,
              });
            }}
          >
            Continue
          </Button>
        </CloseButtonPanel>
      </Modal>
    </>
  );
};
