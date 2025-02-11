import Wrapper from "@/components/layouts/DefaultWrapper";
import DealsMainArea from "@/components/orders/ordersMainArea";
import React from "react";
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

const DealsMain = () => {
  return (
    <ProtectedRoute>
      <Wrapper>
        <DealsMainArea />
      </Wrapper>
    </ProtectedRoute>
  );
};

export default DealsMain;
