CREATE OR ALTER PROCEDURE dbo.TK_661_100_Pr_MUR00107_Batch_TryCath (
  @M00100IDEN VARCHAR(15) OUTPUT,
  @M00110CAT VARCHAR(40) OUTPUT
)
AS
AS
BEGIN
  DECLARE @ReturnValue INT = 0;
  SET NOCOUNT ON;
  --DEBUG
  --DECLARE @M00100IDEN VARCHAR(10) = '202504-01'
  --DEBUG
  DECLARE @Empresa SMALLINT
  DECLARE @PeriodoAno SMALLINT
  DECLARE @PeriodoMes SMALLINT
  DECLARE @Estado SMALLINT
  DECLARE @FecCorte DATE
  DECLARE @FecCorteAnt DATE
  DECLARE @AnoAnt SMALLINT
  DECLARE @MesAnt SMALLINT
  DECLARE @ErrorMessage NVARCHAR(4000)

  -- Inicialización segura de variables con funciones
  BEGIN TRY
    SET @Empresa = dbo.GetEmpresa();
    SET @FecCorte = dbo.FN_GetFechaCorte();
    SET @FecCorteAnt = dbo.FN_GetFechaCorteMesAnterior();
    SET @AnoAnt = YEAR(@FecCorteAnt);
    SET @MesAnt = MONTH(@FecCorteAnt);
  END TRY
  BEGIN CATCH
    SET @ErrorMessage = ERROR_MESSAGE();
    INSERT INTO LogMensajes (Fecha, Procedimiento, Mensaje, Tipo)
      VALUES (GETDATE(), 'MUR00108', @ErrorMessage, 'ERROR');
    RETURN -1;
    SET @ReturnValue = -1;
    RETURN @ReturnValue;
  END CATCH

  SELECT
    @PeriodoAno = M00100ANIO,
    @PeriodoMes = M00100MES
  FROM MUR00100
  --IMPORTANTE: Aqui estamos Homologando el Estado del Crédito
  --SELECT
  --  @Estado = M20020PK3
  --FROM MUR20020
  --WHERE M20010TIPO = 'ESTADOCRED'
  --AND M20020DES1 = @M00110CAT
  --INSERT NIVEL 1
  BEGIN TRY
    BEGIN TRANSACTION;
    DELETE FROM MUR00110
    WHERE M00110IDEN = @M00100IDEN
      AND M00110CAT = @M00110CAT;
    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    SET @ErrorMessage = ERROR_MESSAGE();
    INSERT INTO LogMensajes (Fecha, Procedimiento, Mensaje, Tipo)
      VALUES (GETDATE(), 'MUR00108', @ErrorMessage, 'ERROR');
    RETURN -1;
  END CATCH
  --Obtiene Información de Recuperación
  IF @M00110CAT = 'Pagado' -- Canceladas, Saldadas
  BEGIN
    IF (@Empresa IN (10, 30)) -- GMF y LH
    BEGIN
      --Lógica para Identificar Operaciones SALDADAS, para GMF y LH
      BEGIN TRY
        BEGIN TRANSACTION;
        INSERT INTO MUR00110 (
          M00110IDEN, M00110IDCR, M00110TIDN, M00110NIDN, M00110MODA, M00110PROD, M00110CALD, M00110FDES,
          M00110FVNC, M00110VDES, M00110FRCA, M00110FRIN, M00110TTAS, M00110TGAR, M00110MONE, M00110ESTO,
          M00110CAT, M00110ORI
        )
        SELECT
          @M00100IDEN,
          ope.HoOper,
          ope.TiCodigo,
          ope.EcNroIde,
          tip.ToModelo,
          ope.ToCodigo,
          '',
          ope.HoFecIni,
          ope.HoFTermi,
          ope.HoValIni,
          ope.HoPeriodo,
          ope.HoPeriodo,
          '',
          '',
          ope.MdCodigo,
          'OK',
          @M00110CAT,
          'MUR00108'
        FROM EVHISEV1 ope (NOLOCK)
        LEFT JOIN EVTIPOPE tip (NOLOCK)
          ON tip.ToCodigo = ope.ToCodigo
        WHERE ope.HcAnoCrt = @AnoAnt
          AND ope.HcMesCrt = @MesAnt
          AND ope.HoEstCod = 1
          AND ope.HoOper NOT IN (
            SELECT e.NcOper FROM EVEVAOPE e
          );
        COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @ErrorMessage = ERROR_MESSAGE();
        INSERT INTO LogMensajes (Fecha, Procedimiento, Mensaje, Tipo)
          VALUES (GETDATE(), 'MUR00108', @ErrorMessage, 'ERROR');
        RETURN -1;
        SET @ReturnValue = -1;
        RETURN @ReturnValue;
      END CATCH
      --IMPORTANTE: Esto funciona para GMF y LH, pero para LuloBank, hay que ajustar esta lógica
    END
    IF @Empresa = 20 --LuloBank
    BEGIN
      --Para LuloBank, sería asi:
      --SELECT e.NcEstCod, count(*) FROM EVEVAOPE e GROUP BY e.NcEstCod -- no se almacena aqui.
      --SELECT * FROM EVSALDA e WHERE YEAR(e.salFecha) = YEAR(dbo.FN_GetFechaCorte()) AND MONTH(e.salFecha) = MONTH(dbo.FN_GetFechaCorte()) -- Aqui dan 882
      --Ahora vamos a hacer lo mismo con EVHISEV1 a ver si da igual:
      --SELECT COUNT(*) FROM EVHISEV1 ope
      --WHERE ope.HcAnoCrt = YEAR(dbo.FN_GetFechaCorteMesAnterior())
      --AND ope.HcMesCrt = MONTH(dbo.FN_GetFechaCorteMesAnterior())
      --AND ope.HoEstCod = 1 -- Solo Operaciones Activas
      --AND ope.HoOper NOT IN (SELECT e.NcOper FROM EVEVAOPE e)  -- Aqui dan 832, cual es la verdad? no lo sé.
      --Vamonos por el que tiene más DATA, EVSALDA, nada no podemos hacer más.
      BEGIN TRY
        BEGIN TRANSACTION;
        INSERT INTO MUR00110 (
          M00110IDEN, M00110IDCR, M00110TIDN, M00110NIDN, M00110MODA, M00110PROD, M00110CALD, M00110FDES,
          M00110FVNC, M00110VDES, M00110FRCA, M00110FRIN, M00110TTAS, M00110TGAR, M00110MONE, M00110ESTO,
          M00110CAT, M00110ORI
        )
        SELECT
          @M00100IDEN,
          ope.HoOper,
          ope.TiCodigo,
          ope.EcNroIde,
          tip.ToModelo,
          ope.ToCodigo,
          '',
          ope.HoFecIni,
          ope.HoFTermi,
          ope.HoValIni,
          ope.HoPeriodo,
          ope.HoPeriodo,
          '',
          '',
          ope.MdCodigo,
          'OK',
          @M00110CAT,
          'MUR00108'
        FROM EVHISEV1 ope (NOLOCK)
        LEFT JOIN EVTIPOPE tip (NOLOCK)
          ON tip.ToCodigo = ope.ToCodigo
        WHERE ope.HcAnoCrt = @AnoAnt
          AND ope.HcMesCrt = @MesAnt
          AND ope.HoOper IN (
            SELECT e.salOper FROM evsalda e
            WHERE YEAR(e.salFecha) = @PeriodoAno
              AND MONTH(e.salFecha) = @PeriodoMes
          );
        COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @ErrorMessage = ERROR_MESSAGE();
        INSERT INTO LogMensajes (Fecha, Procedimiento, Mensaje, Tipo)
          VALUES (GETDATE(), 'MUR00108', @ErrorMessage, 'ERROR');
        RETURN -1;
        SET @ReturnValue = -1;
        RETURN @ReturnValue;
      END CATCH
    END
  END
  --Obtiene Información de Recuperación
  IF @M00110CAT = 'Recuperación'
  BEGIN
    IF (@Empresa IN (10, 20)) -- Solo para LuloBank y GMF
    BEGIN
      BEGIN TRY
        BEGIN TRANSACTION;
        INSERT INTO MUR00110 (
          M00110IDEN, M00110IDCR, M00110TIDN, M00110NIDN, M00110MODA, M00110PROD, M00110CALD, M00110FDES,
          M00110FVNC, M00110VDES, M00110FRCA, M00110FRIN, M00110TTAS, M00110TGAR, M00110MONE, M00110ESTO,
          M00110CAT, M00110ORI
        )
        SELECT
          @M00100IDEN,
          ope.HoOper,
          ope.TiCodigo,
          ope.EcNroIde,
          tip.ToModelo,
          ope.ToCodigo,
          '',
          ope.HoFecIni,
          ope.HoFTermi,
          ope.HoValIni,
          ope.HoPeriodo,
          ope.HoPeriodo,
          '',
          '',
          ope.MdCodigo,
          'OK',
          @M00110CAT,
          'MUR00108'
        FROM dbo.CARGAREC AS c WITH (NOLOCK)
        CROSS APPLY (
          SELECT TOP 1 e.*
          FROM dbo.EVHISEV1 AS e WITH (NOLOCK)
          WHERE e.HoOper = c.REvAccOpe
          ORDER BY e.HcAnoCrt DESC, e.HcMesCrt DESC
        ) AS ope
        LEFT JOIN dbo.EVTIPOPE AS tip WITH (NOLOCK)
          ON tip.ToCodigo = ope.ToCodigo
        WHERE YEAR(c.evAcceFech) = @PeriodoAno
          AND MONTH(c.evAcceFech) = @PeriodoMes
          AND ((@Empresa <> 10) OR (c.REvAccEst = 'Perdida'));
        COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @ErrorMessage = ERROR_MESSAGE();
        INSERT INTO LogMensajes (Fecha, Procedimiento, Mensaje, Tipo)
          VALUES (GETDATE(), 'MUR00108', @ErrorMessage, 'ERROR');
        RETURN -1;
        SET @ReturnValue = -1;
        RETURN @ReturnValue;
      END CATCH
    END
    IF (@Empresa IN (30)) -- Hipotecaria
    BEGIN
      BEGIN TRY
        BEGIN TRANSACTION;
        INSERT INTO MUR00110 (
          M00110IDEN, M00110IDCR, M00110TIDN, M00110NIDN, M00110MODA, M00110PROD, M00110CALD, M00110FDES,
          M00110FVNC, M00110VDES, M00110FRCA, M00110FRIN, M00110TTAS, M00110TGAR, M00110MONE, M00110ESTO,
          M00110CAT, M00110ORI
        )
        SELECT
          @M00100IDEN,
          ope.HoOper,
          ope.TiCodigo,
          ope.EcNroIde,
          tip.ToModelo,
          ope.ToCodigo,
          '',
          ope.HoFecIni,
          ope.HoFTermi,
          ope.HoValIni,
          ope.HoPeriodo,
          ope.HoPeriodo,
          '',
          '',
          ope.MdCodigo,
          'OK',
          @M00110CAT,
          'MUR00108'
        FROM dbo.EVPAGOSS AS c WITH (NOLOCK)
        CROSS APPLY (
          SELECT TOP 1 e.*
          FROM dbo.EVHISEV1 AS e WITH (NOLOCK)
          WHERE e.HoOper = c.Pag_NcOper
          ORDER BY e.HcAnoCrt DESC, e.HcMesCrt DESC
        ) AS ope
        LEFT JOIN dbo.EVTIPOPE AS tip WITH (NOLOCK)
          ON tip.ToCodigo = ope.ToCodigo
        WHERE YEAR(c.Pag_FechaC) = @PeriodoAno
          AND MONTH(c.Pag_FechaC) = @PeriodoMes;
        COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @ErrorMessage = ERROR_MESSAGE();
        INSERT INTO LogMensajes (Fecha, Procedimiento, Mensaje, Tipo)
          VALUES (GETDATE(), 'MUR00108', @ErrorMessage, 'ERROR');
       
        SET @ReturnValue = -1;
        RETURN @ReturnValue;
      END CATCH
    END
  END
  RETURN 0;
END
GO
-- Esta es la tabla de Recuperados de La Hipotecaria
--select * FROM EVPAGOSS order BY Pag_FechaC desc
--INSERT NIVEL 2
-- Inserta Atributo 01
--EXEC MUR00122 @M00100IDEN, @M00110CAT -- Hay que hacer otro Procedimiento para el Historico
--EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '1';   -- Razón social
--EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '2';   -- Nombres
--EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '3';   -- Apellidos
--EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '7';   -- Indicador de víctima
--EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '8';   -- Tamaño de empresa
--EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '10';  -- Código CIUU
--EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '11';  -- Municipio de originación
--EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '17';  -- Tipo de consolidación
--EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '18';  -- Id crédito padre
--EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '22';  -- Tipo de recuperación
--EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '32';  -- Garantía inmobiliaria
--INSERT NIVEL 3
BEGIN TRY
  BEGIN TRANSACTION;
  DELETE FROM MUR00130
  WHERE M00130IDEN = @M00100IDEN
    AND M00130CAT = @M00110CAT;
  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  SET @ErrorMessage = ERROR_MESSAGE();
  INSERT INTO LogMensajes (Fecha, Procedimiento, Mensaje, Tipo)
    VALUES (GETDATE(), 'MUR00108', @ErrorMessage, 'ERROR');
 SET @ReturnValue = -1;
        RETURN @ReturnValue;
END CATCH


  --INSERT NIVEL 2    

  --> Inserta Atributo 01
  --EXEC MUR00122 @M00100IDEN, @M00110CAT --> Hay que hacer otro Procedimiento para el Historico
--  EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '1';   -- Razón social
--  EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '2';   -- Nombres
--  EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '3';   -- Apellidos
--  EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '7';   -- Indicador de víctima
--  EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '8';   -- Tamaño de empresa
--  EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '10';  -- Código CIUU
--  EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '11';  -- Municipio de originación
--  EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '17';  -- Tipo de consolidación
--  EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '18';  -- Id crédito padre
--  EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '22';  -- Tipo de recuperación
--  EXEC dbo.MUR00122 @M00100IDEN, @M00110CAT, '32';  -- Garantía inmobiliaria


  --INSERT NIVEL 3
  DELETE FROM MUR00130
  WHERE M00130IDEN = @M00100IDEN
    AND M00130CAT = @M00110CAT


  IF @M00110CAT = 'Pagado'
  BEGIN
    BEGIN TRY
      BEGIN TRANSACTION;
      INSERT INTO MUR00130 (
        M00130IDEN, M00130IDCR, M00130TIDN, M00130NIDN, M00130FECN, M00130CRED, M00130ESTC, M00130PGRD,
        M00130DIAO, M00130TCRE, M00130SPRD, M00130SCAP, M00130SINT, M00130SOTR, M00130MPRV, M00130PPRC,
        M00130PCTC, M00130PADI, M00130POTR, M00130CECA, M00130CEIN, M00130CRCA, M00130CRIN, M00130VGAR,
        M00130FEGA, M00130PINC, M00130PLDI, M00130ESTO, M00130CAT, M00130ORI
      )
      SELECT
        @M00100IDEN,
        ope.HoOper,
        ope.TiCodigo,
        ope.EcNroIde,
        @FecCorte,
        ope.HoCalifHom,
        ope.HoEstCod,
        '',
        ope.HoEdadMr,
        0,
        0,
        ope.HoSalOpe,
        ope.HoIntCauB,
        ope.HoCtaXCob + ope.HoCobOrd,
        tip.ToModelo,
        ope.HoPvCapN + ope.HoPvCapOG + ope.HoPvIntN + ope.HoPvIntOG + ope.HoPvCxCN + ope.HoPvCxCOG + ope.HoPvMorN + ope.HoPvMorOG,
        ope.HoCICCapA + ope.HoCICCapN + ope.HoCICIntA + ope.HoCICIntN + ope.HoCICCxCA + ope.HoCICCxCN + ope.HoCICMorA + ope.HoCICMorN,
        ope.HoProvAdic,
        0,
        0,
        0,
        0,
        0,
        0,
        NULL,
        0,
        0,
        'OK',
        @M00110CAT,
        'MUR00108'
      FROM EVHISEV1 ope (NOLOCK)
      LEFT JOIN EVTIPOPE tip (NOLOCK)
        ON tip.ToCodigo = ope.ToCodigo
      WHERE ope.HcAnoCrt = @AnoAnt
        AND ope.HcMesCrt = @MesAnt
        AND ope.HoEstCod = 1 -- Solo Operaciones Activas
        AND ope.HoOper NOT IN (
          SELECT e.NcOper FROM EVEVAOPE e
        ); -- No fue reportada
      COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
      IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
      SET @ErrorMessage = ERROR_MESSAGE();
      INSERT INTO LogMensajes (Fecha, Procedimiento, Mensaje, Tipo)
        VALUES (GETDATE(), 'MUR00108', @ErrorMessage, 'ERROR');
      SET @ReturnValue = -1;
        RETURN @ReturnValue;
    END CATCH
  END



  IF @M00110CAT = 'Recuperación'
  BEGIN
         IF (@Empresa IN (10, 20)) --> Solo para LuloBank y GMF
    BEGIN
      BEGIN TRY
        BEGIN TRANSACTION;
        INSERT INTO MUR00130 (M00130IDEN, M00130IDCR, M00130TIDN, M00130NIDN, M00130FECN, M00130CRED, M00130ESTC, M00130PGRD
        , M00130DIAO, M00130TCRE, M00130SPRD, M00130SCAP, M00130SINT, M00130SOTR, M00130MPRV, M00130PPRC
        , M00130PCTC, M00130PADI, M00130POTR, M00130CECA, M00130CEIN, M00130CRCA, M00130CRIN, M00130VGAR
        , M00130FEGA, M00130PINC, M00130PLDI, M00130ESTO, M00130CAT, M00130ORI)
          SELECT
            @M00100IDEN
           ,ope.HoOper
           ,ope.TiCodigo
           ,ope.EcNroIde
           ,@FecCorte
           ,ope.HoCalifHom
           ,ope.HoEstCod
           ,''
           ,ope.HoEdadMr
           ,0
           ,0
           ,ope.HoSalOpe
           ,ope.HoIntCauB
           ,ope.HoCtaXCob + ope.HoCobOrd
           ,tip.ToModelo
           ,ope.HoPvCapN + ope.HoPvCapOG + ope.HoPvIntN + ope.HoPvIntOG + ope.HoPvCxCN + ope.HoPvCxCOG + ope.HoPvMorN + ope.HoPvMorOG
           ,ope.HoCICCapA + ope.HoCICCapN + ope.HoCICIntA + ope.HoCICIntN + ope.HoCICCxCA + ope.HoCICCxCN + ope.HoCICMorA + ope.HoCICMorN
           ,ope.HoProvAdic
           ,0
           ,0
           ,0
           ,0
           ,0
           ,0
           ,NULL
           ,0
           ,0
           ,'OK'
           ,@M00110CAT
           ,'MUR00108'
          FROM dbo.CARGAREC AS c WITH (NOLOCK)
          CROSS APPLY (SELECT TOP 1
              e.*
            FROM dbo.EVHISEV1 AS e WITH (NOLOCK)
            WHERE e.HoOper = c.REvAccOpe
            ORDER BY e.HcAnoCrt DESC, e.HcMesCrt DESC) AS ope
          LEFT JOIN dbo.EVTIPOPE AS tip WITH (NOLOCK)
            ON tip.ToCodigo = ope.ToCodigo
          WHERE YEAR(c.evAcceFech) = @PeriodoAno
          AND MONTH(c.evAcceFech) = @PeriodoMes
          AND ((@Empresa <> 10)
          OR (c.REvAccEst = 'Perdida'));
        COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @ErrorMessage = ERROR_MESSAGE();
        INSERT INTO LogMensajes (Fecha, Procedimiento, Mensaje, Tipo)
          VALUES (GETDATE(), 'MUR00108', @ErrorMessage, 'ERROR');
        RETURN -1;
        SET @ReturnValue = -1;
        RETURN @ReturnValue;
      END CATCH
    END

    IF (@Empresa IN (30)) --> Solo para LuloBank y GMF
    BEGIN
      BEGIN TRY
        BEGIN TRANSACTION;
        INSERT INTO MUR00130 (M00130IDEN, M00130IDCR, M00130TIDN, M00130NIDN, M00130FECN, M00130CRED, M00130ESTC, M00130PGRD
        , M00130DIAO, M00130TCRE, M00130SPRD, M00130SCAP, M00130SINT, M00130SOTR, M00130MPRV, M00130PPRC
        , M00130PCTC, M00130PADI, M00130POTR, M00130CECA, M00130CEIN, M00130CRCA, M00130CRIN, M00130VGAR
        , M00130FEGA, M00130PINC, M00130PLDI, M00130ESTO, M00130CAT, M00130ORI)
          SELECT
            @M00100IDEN
           ,ope.HoOper
           ,ope.TiCodigo
           ,ope.EcNroIde
           ,@FecCorte
           ,ope.HoCalifHom
           ,ope.HoEstCod
           ,''
           ,ope.HoEdadMr
           ,0
           ,0
           ,ope.HoSalOpe
           ,ope.HoIntCauB
           ,ope.HoCtaXCob + ope.HoCobOrd
           ,tip.ToModelo
           ,ope.HoPvCapN + ope.HoPvCapOG + ope.HoPvIntN + ope.HoPvIntOG + ope.HoPvCxCN + ope.HoPvCxCOG + ope.HoPvMorN + ope.HoPvMorOG
           ,ope.HoCICCapA + ope.HoCICCapN + ope.HoCICIntA + ope.HoCICIntN + ope.HoCICCxCA + ope.HoCICCxCN + ope.HoCICMorA + ope.HoCICMorN
           ,ope.HoProvAdic
           ,0
           ,0
           ,0
           ,0
           ,0
           ,0
           ,NULL
           ,0
           ,0
           ,'OK'
           ,@M00110CAT
           ,'MUR00108'
          FROM dbo.EVPAGOSS AS c WITH (NOLOCK)
          CROSS APPLY (SELECT TOP 1
              e.*
            FROM dbo.EVHISEV1 AS e WITH (NOLOCK)
            WHERE e.HoOper = c.Pag_NcOper
            ORDER BY e.HcAnoCrt DESC, e.HcMesCrt DESC) AS ope
          LEFT JOIN dbo.EVTIPOPE AS tip WITH (NOLOCK)
            ON tip.ToCodigo = ope.ToCodigo
          WHERE YEAR(c.Pag_FechaC) = @PeriodoAno
          AND MONTH(c.Pag_FechaC) = @PeriodoMes;
        COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @ErrorMessage = ERROR_MESSAGE();
        -- Error registrado en LogMensajes, no se lanza RAISERROR
       SET @ReturnValue = -1;
        RETURN @ReturnValue;
      END CATCH
    END
  END


  RETURN @ReturnValue;
END

GO