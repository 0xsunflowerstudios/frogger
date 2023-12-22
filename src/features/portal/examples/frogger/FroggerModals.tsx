import { Button } from "components/ui/Button";
import { CloseButtonPanel } from "features/game/components/CloseablePanel";
import { NPC_WEARABLES } from "lib/npcs";
import React, { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import PubSub from "pubsub-js";

export const FroggerModals: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const token = PubSub.subscribe("GAME_OVER", () => {
      console.log("React received event:");
      setShowModal(true);
    });

    return () => {
      PubSub.unsubscribe(token);
    };
  }, []);

  const keepPlaying = () => {
    setShowModal(false);
  };

  return (
    <Modal show={showModal} centered onHide={() => setShowModal(false)}>
      <CloseButtonPanel bumpkinParts={NPC_WEARABLES.adam}>
        <p className="text-sm">GAME OVER!</p>
        <Button onClick={keepPlaying}>Continue</Button>
      </CloseButtonPanel>
    </Modal>
  );
};
